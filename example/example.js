 var OssPjax = {
     instance: null,
    methods:
    {
        remoteError: function(eMsg, textState, xhr) {
            if (textState === 'error') {
               alert('当前请求出错，请检查网络或稍后再试!');         
            }
       },
     
        complete: function(newState) {
             console.info("加载完成！");
        }
    },
    start: function(isDev)
    {
        var ossPjax = this;
         // 初始化实例
         ossPjax.instance = $(document).osspjax({
             wraper: "#oss-page-wraper",
             nameSpc: "oss-pjax",
             methods: ossPjax.methods
         });

         // 定义全局goTo方法
         window.goTo = function(url, title) {
            // ossPjax.instance.osspjax("goTo", { url: url, title: title });
            $(document).osspjax("goTo", { url: url, title: title });
         };
    }
 };
 OssPjax.start(1);