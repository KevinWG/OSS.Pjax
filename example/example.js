 var OssPjax = {
     instance: null,
    //  changeState: function(action, url, title) {
    //      var state = this.instance.osspjax("state");
    //      if (url)
    //          state.url = url;
    //      if (title)
    //          state.title = title;
    //      this.instance.osspjax("state", action, state);
    //  },
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
             method: ossPjax.methods
         });

         // 定义全局goTo方法
         window.goTo = function(url, title) {
             ossPjax.instance.osspjax("goTo", { url: url, title: title });
         };
         if (!isDev) { //  自动获取版本
             OsApi.isDebug = false;
            // ossPjax.instance.osspjax("sysVer", { checkVer: true, serverUrl: "/home/opv" });
         }
    }
 };
 OssPjax.start(1);