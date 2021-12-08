# OSS.Pjax
使用 pushstate + ajax 增强用户体验框架，完成单页的效果，基础原理就是拦截a标签地址（或者直接传入页面url）通过ajax加载对应html页面，替换指定容器内容，再通过pushstate方法更改浏览器地址，同时绑定浏览器的前进后退操作完成反向操作。

#使用介绍

```javascript
	var opt={ ... }

    // 默认在id为select_id容器内所有a标签（如： <a oss-pjax-namespc="oss-pjax" href="index1.html">index1</a>） 将会被拦截
	var pjaxInstance =  $("#select_id").osspjax(opt);  

    
	// 自带默认参数如下：
	 var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,//  true 或 function(reqUrl){ return "处理后的url"}

        // 客户端默认版本号获取方法
        clientVer: function () {
            return $("meta").filter(function () {
                var name = $(this).attr("http-equiv");
                return name && name.toLowerCase() === "oss-pjax-ver";
            }).attr("content");
        }, 

        wraper: "#oss-wraper", // 控制容器，获取到的内容将插入当前元素内部
        fragment: "osspjax-container", // 内容部分的类名

        nameSpc: "oss-pjax",    // 实例命名空间，当存在多个实例必须不同
        element: "a[oss-pjax-namespc='oss-pjax']",  //  拦截的元素

        ajaxSetting: {
            timeout: 0,
            type: "GET",
            dataType: "html"
        }, // 获取服务端内容时的ajax配置

        methods: {
            /**
             *  点击时初始执行事件
             * @param {any} event 触发事件对象
             */
            click: function(event) {},

            /**
             * 移除旧容器，可添加动画
             * @param {any} $oldContainer 旧容器（jQuery对象）
             */
            removeOld: function($oldContainer) {
                $oldContainer.remove();
            },

            /**
             * 显示新容器
             * @param {any} $newContainer 新容器（jQuery对象）
             */
            showNew: function($newContainer) {
                $newContainer.show("slow");
            }
        }
    };
```

#JS脚本控制
    OSSPjax在每次更新页面时，会将新页面的js脚本和当前页面的js脚本比较，如果脚本已经存在会重新引用加载。较好使用pjax的方式，是由服务器端针对pjax客户端请求返回局部视图和局部js脚本。
    但是在服务器端不支持局部只能返回全量html的情况下，针对站点全局的js文件，可以在引用时添加 oss-pjax-global 属性，OSSPjax将不会进行重新加载操作，如：

```javascript
	<script oss-pjax-global src="/lib/oss/oss.table.js"></script>
```


#版本控制

为了防止出现服务端版本更新，前端依然在使用老版本进行局部刷新加载。OSSPjax内部添加了版本支持，每次获取服务端内容后会和本地的版本号进行对比，如果不同将会刷新页面。

客户端本地的版本号是从页面中的头部head中获取，示例如下：

```javascript
  <meta http-equiv="oss-pjax-ver" content="1.0.0" />
```

服务端版本号则在请求的新页面响应（Response）的头信息（Header）中的oss-pjax-ver属性中获取。


同时为方便服务端进行动态调整和辨识，在请求的url参数中添加了_opv（客户端版本号，如果没有设置则为1.0）参数，并且在请求的头信息（Header）中会附件如下两个属性：
oss-pjax-ver:当前客户端版本号
oss-pjax: 当前实例命名空间

