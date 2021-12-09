## OSS.Pjax
使用 pushstate + ajax 增强用户体验框架，完成单页的效果。
基础原理就是通过ajax加载指定url地址对应的html内容，并将全部或部分内容替换到当前页面的指定容器内，再通过pushstate方法更改浏览器地址，同时绑定浏览器的前进后退操作，以达到单页的效果。

适用场景：服务端渲染站点（比如电商，社区等站点有强烈的SEO需求），但是需要友好的用户体验（比如搜索列表页，手机端页面切换

## 使用介绍

```javascript
	const opt={ }
	$("#a—select-area").osspjax(opt);  
```
上边默认参数下，会在  id="a—select-area" 的节点内拦截 a[oss-pjax-namespc='oss-pjax'] 的标签，当点击这些a标签时，会通过ajax的方式获取对应 href 地址对应的网页html  
并在html中寻找 class ="osspjax-container" 的节点作为新的内容块（如果找不到，直接创建一个新节点并包含所有html）
确定新的内容块后，会在当前页面寻找 id="#oss-wraper" 的容器，检查容器内部是否存在 class ="osspjax-container" 的内容块，如果存在则移除，再插入新的内容块。


### 默认参数信息

```javascript
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

        nameSpc: "oss-pjax",    
        // 实例命名空间，当存在多个实例，特别是嵌套实例时必须不同，否则浏览器的回退前进操作可能混乱
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
             * 显示新容器，可添加动画
             * @param {any} $newContainer 新容器（jQuery对象）
             */
            showNew: function($newContainer) {
                $newContainer.show("slow");
            }
        }
    };
```


### 扩展方法

在初始化节点信息后可以直接执行以下方法：

1. 直接传递url地址加载

```javascript
	$("#a—select-area").osspjax("http://请求地址");  
```

2. 获取加载状态信息

```javascript
    // 可用来判断是否已经初始化，未初始化返回false，否则返状态对象
    $("#a—select-area").osspjax("state");  
```

###  服务端识别
为方便服务端针对 osspjax 请求进行动态调整和辨识，在请求的url参数中添加了_opv（客户端版本号，如果没有设置则为1.0）参数，并且在请求的头信息（Header）中会附件如下两个属性：
oss-pjax-ver:当前客户端版本号
oss-pjax: 当前实例命名空间


### JS脚本控制（包含文件引用和页内脚本语句）

OSSPjax在每次更新页面时，会将新页面的js脚本和当前页面的js脚本比较，如果脚本已经存在会重新引用加载。  
一种比较较好的方式，是由服务器端针对osspjax客户端请求返回局部视图和局部js脚本。  

但是在服务器端不支持局部只能返回全量html的情况下，针对站点全局的js文件，可以在引用时添加 oss-pjax-global 属性，OSSPjax将不会进行重新加载操作，如：

```javascript
	<script oss-pjax-global src="/lib/oss/oss.table.js"></script>
```

注：在全量返回html并且页面中存在嵌套使用osspjax的情况下，可能存在非全局脚本（比如部分共用的二级页面），但是子级pjax又会造成重新加载，如有需要，可通过获取状态扩展方法判断

### 版本控制

为了防止出现服务端版本更新，前端依然在使用老版本进行局部刷新加载。OSSPjax内部添加了版本支持，每次获取服务端内容后会和本地的版本号进行对比，如果不同将会刷新页面。

客户端本地的版本号是从页面中的头部head中获取，示例如下：

```javascript
  <meta http-equiv="oss-pjax-ver" content="1.0.0" />
```

服务端版本号需要判断是否osspjax请求在（Response）的头信息（Header）中添加oss-pjax-ver属性，由客户端来获取判断。