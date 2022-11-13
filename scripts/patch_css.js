hexo.extend.injector.register('head_end', () => {
  return `
    <style type="text/css">
      .admonition {
        margin: 1.5625em 0;
        padding: .6rem;
        overflow: hidden;
        font-size: .64rem;
        page-break-inside: avoid;
        border-left: .3rem solid #42b983;
        border-radius: .3rem;
        box-shadow: 0 0.1rem 0.4rem rgba(0,0,0,.05), 0 0 0.05rem rgba(0,0,0,.1);
        background-color: #fafafa;
      }

      p.admonition-title {
        position: relative;
        margin: -.6rem -.6rem .8em -.6rem !important;
        padding: .4rem .6rem .4rem 2.5rem;
        font-weight: 700;
        background-color:rgba(66, 185, 131, .1);
      }

      .admonition-title::before {
        position: absolute;
        top: .9rem;
        left: 1rem;
        width: 12px;
        height: 12px;
        background-color: #42b983;
        border-radius: 50%;
        content: ' ';
      }

      .info>.admonition-title, .todo>.admonition-title {
        background-color: rgba(0,184,212,.1);
      }

      .warning>.admonition-title, .attention>.admonition-title, .caution>.admonition-title {
        background-color: rgba(255,145,0,.1);
      }

      .failure>.admonition-title, .missing>.admonition-title, .fail>.admonition-title, .error>.admonition-title {
        background-color: rgba(255,82,82,.1);
      }

      .admonition.info, .admonition.todo {
        border-color: #00b8d4;
      }

      .admonition.warning, .admonition.attention, .admonition.caution {
        border-color: #ff9100;
      }

      .admonition.failure, .admonition.missing, .admonition.fail, .admonition.error {
        border-color: #ff5252;
      }

      .info>.admonition-title::before, .todo>.admonition-title::before {
        background-color: #00b8d4;
        border-radius: 50%;
      }

      .warning>.admonition-title::before, .attention>.admonition-title::before, .caution>.admonition-title::before {
        background-color: #ff9100;
        border-radius: 50%;
      }

      .failure>.admonition-title::before,.missing>.admonition-title::before,.fail>.admonition-title::before,.error>.admonition-title::before{
        background-color: #ff5252;;
        border-radius: 50%;
      }

      .admonition>:last-child {
        margin-bottom: 0 !important;
      }
    </style>
  `;
}, 'default');
