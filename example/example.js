 var OssPjax = {
    instance: null,
    goTo:null,
    
    start: function () {
        const self = this;
        // 初始化实例
        self.instance = $(document).osspjax({
            wraper: "#oss-page-wraper"
        })

        // 除了a标签，也可以直接使用 goTo 方法
        self.goTo = function (url) {
            self.instance.osspjax("goTo", url);
        };
    }
 };

 $(function(){
    OssPjax.start();
 })
