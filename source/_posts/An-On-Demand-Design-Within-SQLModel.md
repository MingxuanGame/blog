---
title: 在 SQLModel 下的一种按需返回的设计
date: 2025-11-22 22:34:00
categories: g0v0-server
tags:
  - SQLModel
  - python
---

本文介绍了在 [g0v0-server](https://github.com/GooGuTeam/g0v0-server) 中使用的按需返回设计。

## 动机

[osu-web](https://github.com/ppy/osu-web) 中使用了 Fractal 的 Transformer 控制 API 的返回，而 g0v0-server 使用了 `from_db` 方法附加 include 参数处理控制返回。但是：

- include 无法传递给子模型
- 各模型的 `from_db` 方法不统一

于是我设计了这样的一种机制：它可以根据指定的 include，将模型导出成精简后的 dict，同时可以根据指定的 include 生成 TypedDict 来传入到 FastAPI 生成文档。

## 架构

对于此设计下定义的模型，字段会被分成四种类型：

- 普通属性
  - 直接定义在模型里，和正常使用一样
- 可选属性
  - 使用 `OnDemand` 包装类型，比如 `OnDemand[int]`
- 普通计算属性
  - 一个函数来计算返回内容，使用 `@included` 装饰
- 可选计算属性
  - 同上，但使用 `@ondemand` 装饰

可选的属性需要在 `includes` 中指定才会返回。此外还可以在转换的时候传入上下文来准确返回需要的内容。

## 实现细节

> 语法采用 Python 3.12+ 的泛型语法，较旧的 Python 请使用 `Generic[T]` 代替。
> 代码省略了类型的导入，请自行从 `typing` 模块导入。

### 准备

首先定义 `OnDemand` 来标识可选属性。由于我们不在真正的模型使用它，这里就使用 `TYPE_CHECKING` 来骗过 type checker。

```python
class OnDemand[T]:
    if TYPE_CHECKING:
        def __get__(self, instance: object | None, owner: Any) -> T: ...


        def __set__(self, instance: Any, value: T) -> None: ...


        def __delete__(self, instance: Any) -> None: ...
```

然后定义 `@included` 和 `@ondemand` 装饰器。这里将对应的标记储存到函数中。

```python
P = ParamSpec("P")
CalculatedField = Callable[Concatenate[AsyncSession, Any, P], Awaitable[Any]]
DecoratorTarget = CalculatedField | staticmethod | classmethod

def _mark_callable(value: Any, flag: str) -> Callable | None:
    target = _get_callable_target(value)
    if target is None:
        return None
    setattr(target, flag, True)
    return target


# 对于 @ondemand， 标记是 `__calculated_ondemand__`
def included(func: DecoratorTarget) -> DecoratorTarget:
    marker = _mark_callable(func, "__included__")
    if marker is None:
        raise RuntimeError("@included is only usable on callables.")

    @wraps(marker)
    async def wrapper(*args, **kwargs):
        return await marker(*args, **kwargs)

    if isinstance(func, staticmethod):
        return staticmethod(wrapper)
    if isinstance(func, classmethod):
        return classmethod(wrapper)
    return wrapper
```

然后我们需要在创建模型的时候读取 `OnDemand` 中的原类型并用这个类型生成类，以及读取函数的标记。于是使用 metaclass 控制生成过程。

```python
from sqlmodel.main import SQLModelMetaclass


_dict_to_model: dict[type, type["DatabaseModel"]] = {}


# https://github.com/fastapi/sqlmodel/blob/main/sqlmodel/_compat.py#L126-L140
def _get_annotations(class_dict: dict[str, Any]) -> dict[str, Any]:
    raw_annotations: dict[str, Any] = class_dict.get("__annotations__", {})
    if sys.version_info >= (3, 14) and "__annotations__" not in class_dict:
        # See https://github.com/pydantic/pydantic/pull/11991
        from annotationlib import (
            Format,
            call_annotate_function,
            get_annotate_from_class_namespace,
        )

        if annotate := get_annotate_from_class_namespace(class_dict):
            raw_annotations = call_annotate_function(annotate, format=Format.FORWARDREF)
    return raw_annotations


class DatabaseModelMetaclass(SQLModelMetaclass):
    def __new__(
        cls,
        name: str,
        bases: tuple[type, ...],
        namespace: dict[str, Any],
        **kwargs: Any,
    ) -> "DatabaseModelMetaclass":
        original_annotations = _get_annotations(namespace)
        new_annotations = {}
        ondemands = []

        # 读取原类型
        for k, v in original_annotations.items():
            if get_origin(v) is OnDemand:
                inner_type = v.__args__[0]
                new_annotations[k] = inner_type
                ondemands.append(k)
            else:
                new_annotations[k] = v

        new_class = super().__new__(
            cls,
            name,
            bases,
            {
                **namespace,
                "__annotations__": new_annotations,
            },
            **kwargs,
        )

        new_class._CALCULATED_FIELDS = dict(getattr(new_class, "_CALCULATED_FIELDS", {}))
        new_class._ONDEMAND_DATABASE_FIELDS = list(getattr(new_class, "_ONDEMAND_DATABASE_FIELDS", [])) + list(
            ondemands
        )
        new_class._ONDEMAND_CALCULATED_FIELDS = dict(getattr(new_class, "_ONDEMAND_CALCULATED_FIELDS", {}))

        for attr_name, attr_value in namespace.items():
            target = _get_callable_target(attr_value)
            if target is None:
                continue
            if getattr(target, "__included__", False):
                new_class._CALCULATED_FIELDS[attr_name] = _get_return_type(target)
            if getattr(target, "__calculated_ondemand__", False):
                new_class._ONDEMAND_CALCULATED_FIELDS[attr_name] = _get_return_type(target)

        # 将 TypedDict 和类对应。详情见下
        for base in get_original_bases(new_class):
            cls_name = base.__name__
            if "DatabaseModel" in cls_name and "[" in cls_name and "]" in cls_name:
                generic_type_name = cls_name[cls_name.index("[") : cls_name.rindex("]") + 1]
                generic_type = evaluate_forwardref(
                    ForwardRef(generic_type_name),
                    globalns=vars(sys.modules[new_class.__module__]),
                    localns={},
                )
                _dict_to_model[generic_type[0]] = new_class

        return new_class
```

然后创建 `DatabaseModel`，`TDict` 用于标记转换后的 dict。

```python
from sqlmodel import SQLModel


class DatabaseModel[TDict](SQLModel, metaclass=DatabaseModelMetaclass):
    _CALCULATED_FIELDS: ClassVar[dict[str, type]] = {}

    _ONDEMAND_DATABASE_FIELDS: ClassVar[list[str]] = []
    _ONDEMAND_CALCULATED_FIELDS: ClassVar[dict[str, type]] = {}
```

这里我们将普通计算属性 存储到了 `_CALCULATED_FIELDS`，可选属性存储到了 `_ONDEMAND_DATABASE_FIELDS`，可选计算属性存储到了 `_ONDEMAND_CALCULATED_FIELDS`。接下来的转换就会读取这些内容。

### 转换的实现

定义 `transform` 方法，接收一个 `DatabaseModel`。在实际使用中这个实例通常是来自数据库的。同时接受 includes，其他的数据库 session 和上下文。

```python
@overload
@classmethod
async def transform(
    cls,
    db_instance: "DatabaseModel",
    *,
    session: AsyncSession,
    includes: list[str] | None = None,
    **context: Any,
) -> TDict: ...

@overload
@classmethod
async def transform(
    cls,
    db_instance: "DatabaseModel",
    *,
    includes: list[str] | None = None,
    **context: Any,
) -> TDict: ...
```

下面编写具体实现。

由于上下文传入需要根据参数名传递，我们使用 `inspect` 模块读取函数参数并传递。

```python
import inspect


async def call_awaitable_with_context(
    func: CalculatedField,
    session: AsyncSession,
    instance: Any,
    context: dict[str, Any],
) -> Any:
    sig = inspect.signature(func)

    if len(sig.parameters) == 2:
        return await func(session, instance)
    else:
        call_params = {}
        for param in sig.parameters.values():
            if param.name in context:
                call_params[param.name] = context[param.name]
        return await func(session, instance, **call_params)
```

现在编写 `transform` 方法。

```python
from sqlalchemy.ext.asyncio import async_object_session
from sqlmodel.ext.asyncio.session import AsyncSession


@classmethod
async def transform(
    cls,
    db_instance: "DatabaseModel",
    *,
    session: AsyncSession | None = None,
    includes: list[str] | None = None,
    **context: Any,
) -> TDict:
    includes = includes.copy() if includes is not None else []
    session = cast(AsyncSession | None, async_object_session(db_instance)) if session is None else session
    if session is None:
        raise RuntimeError("DatabaseModel.transform requires a session-bound instance.")
    resp_obj = cls.model_validate(db_instance.model_dump())
    data = resp_obj.model_dump()

    for field in cls._CALCULATED_FIELDS:
        func = getattr(cls, field)
        value = await call_awaitable_with_context(func, session, db_instance, context)
        data[field] = value

    # 读取嵌套 include
    sub_include_map: dict[str, list[str]] = {}
    for include in [i for i in includes if "." in i]:
        parent, sub_include = include.split(".", 1)
        if parent not in sub_include_map:
            sub_include_map[parent] = []
        sub_include_map[parent].append(sub_include)
        includes.remove(include)  # pyright: ignore[reportOptionalMemberAccess]

    for field, sub_includes in sub_include_map.items():
        if field in cls._ONDEMAND_CALCULATED_FIELDS:
            func = getattr(cls, field)
            # 将嵌套 include 传递下去
            value = await call_awaitable_with_context(
                func, session, db_instance, {**context, "includes": sub_includes}
            )
            data[field] = value

    for include in includes:
        if include in data:
            continue

        if include in cls._ONDEMAND_CALCULATED_FIELDS:
            func = getattr(cls, include)
            value = await call_awaitable_with_context(func, session, db_instance, context)
            data[include] = value

    for field in cls._ONDEMAND_DATABASE_FIELDS:
        if field not in includes:
            # 对于可选 属性，在 dump 时会在 data 中存在，在这里删除掉。
            del data[field]

    return cast(TDict, data)
```

### TypedDict 的生成

由于 FastAPI 内部使用 `TypeAdapter` 生成 JSON Schema，但 `ForwardRef` 无法被正确解析，我们需要在模型创建时生成对应的 `TypedDict` 并将其和模型对应起来。

这里使用来自 [Pydantic v1 的代码](https://github.com/pydantic/pydantic/blob/main/pydantic/v1/typing.py#L58-L77)解析 `ForwardRef`，方法名为 `evaluate_forwardref`。

但如果标注在 `DatabaseModel` 的 `TypedDict` 无法被正确解析，往往是那个模型的 module 不存在此类型（通常是在 `if TYPE_CHECKING` 中导入），则需要在一个导入了所有 TypedDict 的模块中导入这个模型模块以确保类型存在。（在 g0v0-server 中这个模块是 `app.database`）

```python
def _safe_evaluate_forwardref(type_: str | ForwardRef, module_name: str) -> Any:
    """Safely evaluate a ForwardRef, with fallback to app.database module"""
    if isinstance(type_, str):
        type_ = ForwardRef(type_)

    try:
        return evaluate_forwardref(
            type_,
            globalns=vars(sys.modules[module_name]),
            localns={},
        )
    except (NameError, AttributeError, KeyError):
        # 回退到 app.database
        try:
            import app.database

            return evaluate_forwardref(
                type_,
                globalns=vars(app.database),
                localns={},
            )
        except (NameError, AttributeError, KeyError):
            return None
```

现在开始实现 `generate_typeddict`。嵌套的 `DatabaseModel` 也会被转换成对应的 `TypedDict`。

```python
from functools import lru_cache


@classmethod
@lru_cache
def generate_typeddict(cls, includes: tuple[str, ...] | None = None) -> type[TypedDict]:  # pyright: ignore[reportInvalidTypeForm]
    def _evaluate_type(field_type: Any, *, resolve_database_model: bool = False, field_name: str = "") -> Any:
        # 尝试解析 ForwardRef
        if isinstance(field_type, (str, ForwardRef)):
            resolved = _safe_evaluate_forwardref(field_type, cls.__module__)
            if resolved is not None:
                field_type = resolved

        origin_type = get_origin(field_type)
        inner_type = field_type
        args = get_args(field_type)

        is_optional = type_is_optional(field_type)  # pyright: ignore[reportArgumentType]
        if is_optional:
            inner_type = next((arg for arg in args if arg is not NoneType), field_type)

        is_list = False
        if origin_type is list:
            is_list = True
            inner_type = args[0]

        # 尝试解析内层类型的 ForwardRef
        if isinstance(inner_type, (str, ForwardRef)):
            resolved = _safe_evaluate_forwardref(inner_type, cls.__module__)
            if resolved is not None:
                inner_type = resolved

        if not resolve_database_model:
            if is_optional:
                return inner_type | None  # pyright: ignore[reportOperatorIssue]
            elif is_list:
                return list[inner_type]
            return inner_type

        model_class = None

        # 首先检查 inner_type 是否直接是 DatabaseModel 的子类
        try:
            if inspect.isclass(inner_type) and issubclass(inner_type, DatabaseModel):  # type: ignore
                model_class = inner_type
        except TypeError:
            pass

        # 如果没有找到，查找 _dict_to_model
        if model_class is None:
            model_class = _dict_to_model.get(inner_type)  # type: ignore

        if model_class is not None:
            nested_dict = model_class.generate_typeddict(tuple(sub_include_map.get(field_name, ())))
            resolved_type = list[nested_dict] if is_list else nested_dict  # type: ignore

            if is_optional:
                resolved_type = resolved_type | None  # type: ignore

            return resolved_type

        # 回退：使用解析后的 inner_type
        resolved_type = list[inner_type] if is_list else inner_type  # type: ignore
        if is_optional:
            resolved_type = resolved_type | None  # type: ignore
        return resolved_type

    if includes is None:
        includes = ()

    # 解析嵌套的 includes
    direct_includes = []
    sub_include_map: dict[str, list[str]] = {}
    for include in includes:
        if "." in include:
            parent, sub_include = include.split(".", 1)
            if parent not in sub_include_map:
                sub_include_map[parent] = []
            sub_include_map[parent].append(sub_include)
            if parent not in direct_includes:
                direct_includes.append(parent)
        else:
            direct_includes.append(include)

    fields = {}

    # 处理非计算的属性
    for field_name, field_info in cls.model_fields.items():
        field_type = field_info.annotation or Any
        field_type = _evaluate_type(field_type)

        if field_name in cls._ONDEMAND_DATABASE_FIELDS and field_name not in direct_includes:
            continue
        else:
            fields[field_name] = field_type

    # 处理计算属性
    for field_name, field_type in cls._CALCULATED_FIELDS.items():
        field_type = _evaluate_type(field_type, resolve_database_model=True)
        fields[field_name] = field_type

    # 处理按需计算属性
    for field_name, field_type in cls._ONDEMAND_CALCULATED_FIELDS.items():
        if field_name not in direct_includes:
            continue

        field_type = _evaluate_type(field_type, resolve_database_model=True)
        fields[field_name] = field_type

    return TypedDict(f"{cls.__name__}Dict[{', '.join(includes)}]", fields)  # pyright: ignore[reportArgumentType]
```

## 示例

推荐像下面这样的 Dict - Model - Table 的设计。其中 Dict 必须在 Model 之前定义以便解析类型。

```python
from typing import TypedDict, NotRequired
from pydantic import TypeAdapter
from sqlmodel import Field, Relationship, select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import FastAPI, Depends, HTTPException


class UserProfileDict(TypedDict):
    bio: NotRequired[str]
    avatar_url: NotRequired[str]


class UserProfileModel(DatabaseModel[UserProfileDict]):
    id: int = Field(primary_key=True)
    bio: OnDemand[str]
    avatar_url: OnDemand[str]


class UserProfile(UserProfileModel, table=True):
    pass


class UserDict(TypedDict):
    id: int
    name: str
    email: NotRequired[str]
    profile: NotRequired["UserProfileDict"]
    followers_count: NotRequired[int]


class UserModel(DatabaseModel[UserDict]):
    id: int = Field(primary_key=True)
    name: str
    email: OnDemand[str]

    @included
    @staticmethod
    async def followers_count(session: AsyncSession, instance: "User") -> int:
        from .followers import Follower


        result = await session.execute(
            select(func.count()).select_from(Follower).where(Follower.followed_id == instance.id)
        )
        return result.one()

    @ondemand
    @staticmethod
    async def profile(session: AsyncSession, instance: "User", includes: list[str] | None = None) -> "UserProfileDict":
        profile = await session.get(UserProfile, instance.id)
        if profile is None:
            return {}
        return await UserProfileModel.transform(profile, includes=includes)


class User(UserModel, table=True):
    # 定义一些不导出的内容和 Relationships...
    followers: list["Follower"] = Relationship(back_populates="followed")


async def example_usage(session: AsyncSession):
    user = await session.get(User, 1)
    assert user is not None

    user_dict = await UserModel.transform(
        user,
        includes=["email", "followers_count", "profile.bio"],
    )
    print("Dump result:")
    print(user_dict)
    print()
    print("TypedDict JSON Schema result:")
    UserTypedDict = UserModel.generate_typeddict(("email", "followers_count", "profile.bio"))
    print(TypeAdapter(UserTypedDict).json_schema())


app = FastAPI()


@app.get("/user/{user_id}", response_model=UserModel.generate_typeddict(("email", "followers_count", "profile.bio")))
async def get_user(user_id: int, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return await UserModel.transform(
        user,
        includes=["email", "followers_count", "profile.bio"],
    )
```

输出应该是这样的：

```python
Dump result:
{
    "id": 1,
    "name": "MingxuanGame",
    "email": "MingxuanGame@example.com",
    "followers_count": 42,
    "profile": {
        "bio": "For love and fun!"
    }
}

TypedDict JSON Schema result:
{
    "$defs": {
        "UserProfileDict_bio_": {
            "properties": {
                "id": {"title": "Id", "type": "integer"},
                "bio": {"title": "Bio", "type": "string"},
            },
            "required": ["id", "bio"],
            "title": "UserProfileDict[bio]",
            "type": "object",
        }
    },
    "properties": {
        "id": {"title": "Id", "type": "integer"},
        "name": {"title": "Name", "type": "string"},
        "email": {"title": "Email", "type": "string"},
        "followers_count": {"title": "Followers Count", "type": "integer"},
        "profile": {"$ref": "#/$defs/UserProfileDict_bio_"},
    },
    "required": ["id", "name", "email", "followers_count", "profile"],
    "title": "UserDict[email, followers_count, profile.bio]",
    "type": "object",
}
```

API 文档也可以在 Swagger UI 中正确显示。

## 思路

有关 `OnDemand[T]` 的内容受到了 SQLModel 对 `Mapped` 的处理的启发。`Mapped` 在使用方面和直接使用对象无异，但在类型检查时会被解析成原类型，原理就在于伪装 `__get__`，`__set__`，`__delete__` 方法。

## 其他问题

> 为什么不直接使用 Pydantic 的 `include` 参数？

Pydantic 的 `include` 参数无法传递给子模型，而这种设计可以将 include 传递给子模型以实现更精细的控制。并且这种设计可以生成 TypedDict 以供 FastAPI 使用，从而生成更准确的文档。

> 为什么不调用 Table 的 `transform` 或者将 `transform` 作为实例方法直接 dump Table？

由于 Table 存储一些不需要导出的内容（比如邮箱和密码），而先 `model_dump` 再 `model_validate` 会导致 `ValidateError`。同时 Table 往往存在与响应同名的 Relationship，重名会导致无法正确 dump。

> Dict 存在的意义是什么

Dict 使在代码内使用 dump 后的 dict 拥有类型支持。对于响应文档，只需要使用 `Model.generate_typeddict` 生成的 TypedDict 即可。
