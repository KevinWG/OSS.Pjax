# OSS.Pjax
使用 pushstate + ajax 增强用户体验框架，支持多个实例同时存在

#使用介绍

```javascript
	var opt={}
	var pjaxInstance =  $("#select_id").osspjax();
	// 自带默认参数如下：
	 var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,//  true 或 function(reqUrl){ return "处理后的url"}

        nameSpc: "oss-pjax",  //实例命名空间，当存在多个实例必须不同
        wraper: "#oss-wraper", // 核心控制器（类名或Id），容器的上一级
        fragment: "osspjax-container", // 容器类名，会被动态删除加载

        ajaxSetting: {
            timeout: 0,
            type: "GET",
            dataType: "html"
        },

        methods: {
            /**
             *  点击时初始执行事件
             * @param {any} event 触发事件对象
             */
            click: function(event) {},

            /**
             * 加载远程内容之前事件
             * @param {any} ajaxOpt  ajax请求相关参数，可以更改
             */
            beforeRemote: function(ajaxOpt) {},

            /**
             * 过滤请求结果
             * @param {any} res  请求结果
             * @param {any} textState ajax 请求状态
             * @param {any} xhr  xmlhttprequest
             * @returns {any} 如果返回false 会触发 remoteError 事件。 或者返回处理后的html继续后续流程
             */
            resultFilter: function(res, textState, xhr) { return res; },

            /**
             * 获取内容结束事件
             * @param {any} errMsg  请求结果
             * @param {any} textState ajax 请求状态
             * @param {any} xhr  xmlhttprequest
             */
            remoteError: function(errMsg, textState, xhr) {},

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
            showNew: function($newContainer,afterShow) {
                $newContainer.show("slow");
                afterShow();
            },
            
            /**
             * 结束事件
             * @param {any} newState 新的页面状态记录
             */
            complete: function(newState) {}
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
   1. 在每次请求的响应（Response）的头信息中添加 X-PJAX-Ver 版本信息，客户端自动会自动进行校验和刷新切换，如果不存在客户端不会进行比对		
   2. 通过独立的服务端版本校验接口，默认不启用需要手动开启，客户端会在间隔[5-20]分钟内发起检测（间隔时间客户端会动态调整），手动开启方法如下（多个实例时，建议只开启一次）：

   同时为方便服务端进行动态调整和辨识，在请求的头信息中会附件如下两个属性：
   X-PJAX-Ver:当前客户端版本号
   X-PJAX: 当前实例命名空间
