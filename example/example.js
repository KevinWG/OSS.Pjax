 var OssPjax = {
     instance: null,
    start: function()
    {
         // 初始化实例
         this.instance = $(document).osspjax({
             wraper: "#oss-page-wraper"
         });

         // 定义全局goTo方法
         window.goTo = function(url) {   
            $(document).osspjax("goTo",  url);
         };
    }
 };

 $(function(){
    OssPjax.start();
 })
