# OSS.Pjax
使用 pushstate + ajax 增强用户体验框架，完成单页的效果，基础原理就是拦截a标签地址（或者直接传入页面url）通过ajax加载对应html页面，替换指定容器内容，再通过pushstate方法更改浏览器地址，同时绑定浏览器的前进后退操作完成反向操作。

#使用介绍

```javascript
	var opt={ ... }
	var pjaxInstance =  $("#select_id").osspjax(opt);  
    // 在id为select_id容器内所有a[命名空间]标签（如： <a oss-pjax-namespc="oss-pjax" href="index1.html"> index1</a>） 将会被拦截
    
	// 自带默认参数如下：
	 var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,//  true 或 function(reqUrl){ return "处理后的url"}

        nameSpc: "oss-pjax",  // 实例命名空间，当存在多个实例必须不同
        wraper: "#oss-wraper", // 控制器id，获取到的内容将插入当前元素内部
        fragment: "osspjax-container", // 容器类名，服务器返回全量html时，根据此类名获取页面更新内容，注意使用的是类名，方便部分自定义页面切换动画可以新旧内容在控制器中同时存在

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
             * @param {any} $oldContainer 旧容器
             */
            removeOld: function($oldContainer) {
                $oldContainer.remove();
            },

            /**
             * 显示新容器
             * @param {any} $newContainer 新容器
             * @param {any} afterShow showNew结束前必须执行的回调
             */
            showNew: function($newContainer) {
                $newContainer.show("slow");
            }
        }
    };
```


#版本控制

```javascript
	pjaxInstance.osspjax("sysVer", { checkVer: true, serverUrl: url });
	// or
	$("#select_id").osspjax("sysVer", { checkVer: true, serverUrl: url });

	// 默认参数如下
	{
		version: 0, // 客户端默认版本号
		checkVer: false, // 默认关闭服务端检测
		serverUrl: "", // 服务端接口地址，直接返回 如：1.0.0
		type: "GET", // 服务端接口请求地址
		intervalMins: 15 // 第一次默认检测间隔时间
    }
```

   通常静态文件或者部分页面可以直接通过服务设置 Cache-Control 告诉浏览器进行缓存，本控件在请求时会附件版本号请求，初始版本号可以在上边的参数中设置
   也可以通过头信息中获取，可以在响应请求中head中添加如下代码：
```javascript
  <meta http-equiv="app-version" content="1.1.0" />
```

如果默认参数和头信息中都没有设置，则请求中永久附带 _opv=1.0 发送请求
如果存在客户端初始版本相关信息，则有两种方式进行客户端和服务端的版本比对
   1. 在每次请求的响应（Response）的头信息中添加 oss-pjax-ver 版本信息，客户端自动会自动进行校验和刷新切换，如果不存在客户端不会进行比对		
   2. 通过独立的服务端版本校验接口，默认不启用需要手动开启，客户端会在间隔[5-20]分钟内发起检测（间隔时间客户端会动态调整）（多个实例时，建议只开启一次）

同时为方便服务端进行动态调整和辨识，在客户端请求的头信息中会附件如下两个属性：
oss-pjax-ver:当前客户端版本号
oss-pjax: 当前实例命名空间


#脚本控制
    OSSPjax在每次更新页面时，会将新页面的js脚本和当前页面的js脚本比较，如果脚本已经存在会重新引用加载。较好使用pjax的方式，是由服务器端针对pjax客户端请求返回局部视图和局部js脚本。
    但是在服务器端不支持局部只能返回全量html的情况下，针对站点全局的js文件，可以在引用时添加 oss-pjax-global 属性，OSSPjax将不会进行重新加载操作，如：

```javascript
	<script oss-pjax-global src="/lib/oss/oss.table.js"></script>
```
