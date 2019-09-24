+function ($) {
    var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,
        animation:true,  //  是否开启动画，  单独元素可以添加 noanimation 属性

        nameSpc: "oss-pjax",
        wraper: "#oss-wraper",
        fragment: "ospjax-container",

        ajaxSetting: {
            timeout: 0,
            type: "GET",
            dataType: "html"
        },
        method: {
            /**
             *  点击事件，   可以通过 event.preventDefault()取消后续执行
             * @param {} event 
             */
            click: function(event) {},

            /**
             * 加载远程内容之前事件
             * @param {} ajaxOpt  ajax请求相关参数，可以更改
             */
            beforeRemote: function(ajaxOpt) {},

            /**
             * 过滤请求结果
             * @param {} res  请求结果
             * @param {} textState ajax 请求状态
             * @param {} xhr  xmlhttprequest
             * @returns 如果返回false 会触发 remoteError 事件。 或者返回处理后的html继续后续流程
             */
            resultFilter: function(res, textState, xhr) { return res },

            /**
             * 获取内容结束事件
             * @param {} res  请求结果
             * @param {} textState ajax 请求状态
             * @param {} xhr  xmlhttprequest
             * @returns  
             */
            remoteError: function(errMsg, textState, xhr) {},

            /**
             * 内容格式化前事件，系统格式化后将分离css，js，version等属性，可以在这里做更细化的处理
             * @param {} newContainer  初始新容器
             * @param {} formatContent   初始内容对象，
             * @returns {} 
             */
            beforeFormat: function (newContainer, formatContent) { },

            /**
             *   css加载前事件，此时内容都没有加载
             * @param {} newContent
             * @returns {} 
             */
            cssLoading: function(newContent) {},
            /**
              *   script加载前事件，此时css和html已经加载
              * @param {} newContent
              * @returns {} 
              */
            scriptLoading: function(newContent) {},
            /**
             * 自定义动画处理
             * @param {} $newContainer 
             * @param {} $oldContainer 
             * @param {} endFunc 
             */
            trans: function($newContainer, $oldContainer, endFunc) {
                $oldContainer.hide("slow");
                $newContainer.show("slow");
                endFunc();
            },

            /**
             *  结束事件
             */
            complete: function(newState) {}
        }
    };
    
    var OSPjax = function(element, opt) {
        var self = this;
        self.opt = opt;

        // 设置初始页的页面状态值
        var firstState = setPageState(self);
        if (opt.push || opt.replace)
            window.history.replaceState(firstState, firstState.title, firstState.url);

        $(element).on("click.pjax" + opt.nameSpc.replace(".", "_"),
            "a[opj-namespc='" + opt.nameSpc + "']",
            function(event) {
                self.click(event);
            });
    };
    // 实例属性： state 是当前页面信息，   xhr 远程请求实体信息
    // 原型属性： haveSysVerCheck  是否已经开启服务器版本检查
    OSPjax.prototype = {
        click: function(event) {            
            var req = formatLinkEvent(event);
            if (!req)
                return;

            this.opt.method.click(event);
            if (event.isDefaultPrevented())
                return;

            this.goTo(req);
            preventDefault(event);
        },
        forceTo: function(url) {
            window.location.href = url;
        },
        /**
         * 
         * @param {} req { url:"", title: "", popDirection: 0, popState: null, no_animation:false}
         * @returns {} 
         */
        goTo: function(req) {
            var osPjax = this;
            //  处理请求地址参数
            setReqUrl(osPjax.opt, req);

            osPjax.getContent(req).then(function(con) {
                checkContentVsersion(osPjax.sysOpt, con);
                var opt = osPjax.opt;
                if (!req.popState) {
                    if (opt.push || opt.replace) {
                        var newState = setPageState(osPjax, con);
                        if (opt.push)
                            window.history.pushState(newState, newState.title, newState.url);
                        else if (opt.replace)
                            window.history.replaceState(newState, newState.title, newState.url);  
                    }
                } else {
                    setPageState(osPjax, null, req.popState);
                }

                if (con.title && (opt.push || opt.replace))
                    document.title = con.title;

                var animation = opt.animation && !req.no_animation;
                osPjax.replaceContent(con, animation);

            }).fail(function(errMsg, textStatus, hr) {
                osPjax.opt.method.remoteError(errMsg, textStatus, hr);
            });
        },

        replaceContent: function(con, animation) {
            var osPjax = this;
            var opt = osPjax.opt;

            var $wraper = $(opt.wraper);
            //  防止翻页过快导致的页面同时出现两个相同的模块
            $wraper.find("." + opt.fragment + "[oss-pjax-abandon]").remove();

            var $oldContainer = $wraper.find("." + opt.fragment);
            if ($.contains($oldContainer, document.activeElement)) {
                try {
                    document.activeElement.blur();
                } catch (e) {}
            }

            if (animation) {
                $oldContainer.attr("oss-pjax-abandon", "oss-pjax-abandon");
            } else {
                $oldContainer.remove();
            }

            osPjax.opt.method.cssLoading(con);
            con.content.prepend(con.css);
            con.content.appendTo($wraper);

            osPjax.opt.method.scriptLoading(con);
            con.content.append(con.scripts);

            if (animation) {
                opt.method.trans(con.content,
                    $oldContainer,
                    function() {
                        $oldContainer.remove();
                        con.content.show(); //  以确保没有问题
                        opt.method.complete(osPjax.pageState);
                    });
            } else {
                con.content.show(); //  以确保没有问题
                opt.method.complete(osPjax.pageState);
            }

        },
        /**
         *  获取内容
         * @param {} req 
         * @returns {}  promise对象
         */
        getContent: function(req) {
            var osPjax = this;
            var opt = osPjax.opt;

            var ajaxOpt = $.extend({}, { url: req.remote_url }, opt.ajaxSetting);

            // 附加数据，版本号处理
            var ver = typeof osPjax.sysOpt.version == "function" ? osPjax.sysOpt.version() : osPjax.sysOpt.version;

            //  todo  可以添加页面级缓存，并和当前版本号比较（非必要）
            if (!ajaxOpt.data) ajaxOpt.data = {}
            if ($.isArray(ajaxOpt.data)) {
                ajaxOpt.data.push({ name: "_pav", value: ver });
            } else {
                ajaxOpt.data._pav = ver;
            }
            
            abortXHR(osPjax.xhr);
            opt.method.beforeRemote(ajaxOpt); //  加载之前触发事件

            //  处理ajax的beforeSend
            var oldBeforEvent = ajaxOpt.beforeSend;
            ajaxOpt.beforeSend = function(x) {
                x.setRequestHeader("X-PJAX-Ver", ver);
                x.setRequestHeader("X-PJAX", opt.nameSpc);

                if (oldBeforEvent && typeof oldBeforEvent == "function") {
                    oldBeforEvent();
                }
            }
            var defer = $.Deferred();
            osPjax.xhr = $.ajax(ajaxOpt).done(function(resData, textStatus, hr) {
                var filterRes = !opt.method.resultFilter ? resData : opt.method.resultFilter(resData, textStatus, hr);
                if (!filterRes) {
                    defer.reject(resData, textStatus, hr);
                } else {
                    var con = formatContent(filterRes, opt, req, hr);
                    defer.resolve(con);
                }
            }).error(function(hr, textStatus, errMsg) {
                defer.reject(errMsg, textStatus, hr);
            });

            return defer.promise();
        },

        onPopstate: function (state, direction) {
            if (state && state.url) {
                this.goTo({ url: state.url, title: state.title, popDirection: direction, popState: state});
            };
        },
    
        /**
        * 获取或者设置当前的页面State
        * @param {} state 
        * @returns {} 
        */
        state: function (action,state) {
            if (state && state.url) {
                if (action === "pushState") {
                    window.history.pushState(state, state.title, state.url);
                } else {
                    window.history.replaceState(state, state.title, state.url);
                }
                setPageState(this, null, state);
                return true;
            }
            return this.pageState;
        },
        sysOpt: {
            //如果服务端设置了页面max-age过大
            //可以主动设置发起版本查看，以便请求时自动附带新版本号
            checkVer:false,
            serverUrl:"",
            version: findVersion,
            type: "GET",
            intervalMins: 10
        },

        /**
         *   设置系统级变量信息，如版本号等
         * @param {} opt 
         * @returns {} 
         */
        sysVer: function (opt) {
            if (!!opt) {
                $.extend(this.sysOpt, opt);
                if (this.sysOpt.checkVer && this.sysVerCheckCount === 0) {
                    this.sysVerCheckCount = 1;
                    checkServerVersion(this, 5); //  5分钟后开始第一次检测
                }
                return true;
            }
            return this.SysOpt;
        },
        sysVerCheckCount: 0
};

  
    /**
     *  检查服务器版本
     * @param {any} osPjax
     * @param {any} mins
     */
    function checkServerVersion(osPjax, mins) {
        var opt = osPjax.sysOpt;

        mins = mins === 0 ? opt.intervalMins : mins;
        osPjax.sysVerCheckCount += 1;

        $.ajax({ url: opt.serverUrl, type: opt.type })
            .done(function (v) {
                var curVer = typeof osPjax.sysOpt.version == "function" ? osPjax.sysOpt.version() : osPjax.sysOpt.version;
                if (v !== curVer) {
                    window.location.href = formatUrlWithVersion(location.href, v);
                }
                if (mins < 20) mins += 1;
            })
            .error(function() {
                if (mins > 8) mins -= 1;
            }).complete(function () {
                setTimeout(function() { checkServerVersion(osPjax, mins); }, mins * 60 * 1000);
            });
    }

    function formatUrlWithVersion(url,v) {
        if (url.indexOf("_opv=") > 0) {
            url = url.replace(/(_opv=).*?(&)/, "$1" + v + '$2');
        } else {
            if (url.indexOf("?") < 0)
                url += "?_opv=" + v;
            else
                url += "&_opv=" + v;
        }
        return url;
    }

    function checkContentVsersion(sysOpt, con) {
        // 附加数据，版本号处理
        var ver = typeof sysOpt.version == "function" ? sysOpt.version() : sysOpt.version;
        if (!ver) {
            sysOpt.version = con.version;
            return;
        }

        //  版本不同，或者内容不存在
        if ((con.version && con.version !== ver)
            || !con.content) {
            window.location.href = formatUrlWithVersion(con.url, con.version);
        }
    }

    /**
     * 创建页面置换状态
     * @param {any} title
     * @param {any} url
     */
    function createState(stateCon, opt) {
        var newState = {
            id: new Date().getTime(),
            nameSpc: opt.nameSpc,
            title: stateCon.title || document.title,
            url: stateCon.url || document.URL
        };
        return newState;
    }

    function setPageState(instance, stateCon,state) {
        if (!state) {
            if (!stateCon) {
                //isFirstInitail = true;
                state = createState({}, instance.opt);
            } else {
                state = createState(stateCon, instance.opt);
            }
            state._deepLevel = getDeepLevel(instance.opt.nameSpc);
        }
        return window.ospjaxCurPageState = instance.pageState = state;
    }

    /**
    * 去除url 的 hash值
    * @param {any} location
    */
    function stripHash(location) {
        return location.href.replace(/#.*/, "");
    }

    /**
     *  终止请求
     * @param {any} xhr
     */
    function abortXHR(xhr) {
        if (xhr && xhr.readyState < 4) {
            xhr.onreadystatechange = $.noop;
            xhr.abort();
        }
    }

    /**
     *   格式化内容实体
     * @param {any} html
     * @param {any} opt
     * @param {any} req
     * @param {any} xhr
     */
    function formatContent(html, opt, req, xhr) {
        var con = {};
        var $html = null;
        con.origin = html;
        con.isFull = /<html/i.test(html);        
        
        if (con.isFull) {
            var conReg=html.match(/<body[^>]*>([\s\S.]*)<\/body>/i);
            if(conReg&&conReg.length>=2 ){
                $html= $(conReg[1]);
                var $container= $html.find("."+opt.fragment).first()
                if ($container.length>0) {                
                    $html = $container;
                }
            }
            if(!$html){
                $html = $("<div></div>");
            }
            var titleReg=html.match(/<title[^>]*>([\s\S.]*)<\/title>/i);
            if(titleReg&&titleReg.length>0 ){
                $html.append(($(titleReg[0])));
            }
        }

        if (!$html.hasClass(opt.fragment))
            $html = $("<div class='"+opt.fragment+"' style='display:none'></div>").append($html);
        
        opt.method.beforeFormat($html, con);

        con.title = $html.find("title").last().remove().text();
        con.scripts = $html.find("script").remove();
        con.css = $html.find("link[rel='stylesheet'],style").remove();
        con.content = $html;

        if (!con.title) 
            con.title = $html.attr("title") || $html.data("title") || req.title;
        
        con.version = xhr.getResponseHeader("X-PJAX-Ver");
        con.url = req.url;
        
        return con;
    }

    /**
    *  验证链接
    * @param {any} event   链接元素
     * @return  false-停止Pjax，执行原生。   {} Pjax执行需要的地址信息
    */
    function formatLinkEvent(event) {
        var link = event.currentTarget;
        if (!link)
            return false;

        if (link.tagName.toUpperCase() !== "A")
            throw "ospjax click event requires an anchor element";

        // 如果已经被阻止，则取消
        if (event.isDefaultPrevented())
            return false;

        if (event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return false;

        // 忽略跨域请求
        if (link.protocol && location.protocol !== link.protocol ||
            link.hostname && location.hostname !== link.hostname)
            return false;

        if (stripHash(link) === stripHash(location)) {
            if (link.href.indexOf("#") === -1 || link.href === location.href) {
                //  当页地址，且非锚点请求，阻止后续
                preventDefault(event);
            }
            return false;
        }

        return {
            url: link.href,
            title: link.title,
            no_animation: link.hasAttribute("noanimation")
        };
    }

    /**
     *  如果启用了过滤参数，请求时去除query参数，适用于模板请求
     * @param {any} opt
     * @param {any} req
     */
    function setReqUrl(opt, req) {
      
        var q = opt.noQuery;

        if (q) {

            if (typeof q === "function") {
                req.remote_url = q(req.url);
            } else {
                var index = req.url.indexOf("?");
                if (index > 0)
                    req.remote_url = req.url.substring(0, index);
            }
        }

        if (!req.remote_url)
            req.remote_url = req.url;
    }

    /**
     *  查找头部meta的版本信息
     */
    function findVersion() {
        return $("meta").filter(function() {
            var name = $(this).attr("http-equiv");
            return name && name.toLowerCase() === "app-version";
        }).attr("content");
    }

    //  在pop时，如果方向为旧前进到新，需要按照旧实例处理。
    //  11122   (在第三页初始化新的实例)
    //  11222
    function addPopHandler(nameSpc, handler) {

        if (!this.popHandlers)
            this.popHandlers = [];

        this.popHandlers[nameSpc] = handler;

        if (!this.onPopstateTriger)
            window.onpopstate = this.onPopstateTriger =
                function (event) {
                   
                    var pageState = event.state;
                    if (!pageState) return;

                    var handlerSpc = pageState.nameSpc;
                    var curState = window.ospjaxCurPageState;
                    var direction = curState.id < pageState.id ? 1 : 2; //  1 . 前进   2. 后退

                    if (pageState.nameSpc !== curState.nameSpc
                        && pageState._deepLevel > curState._deepLevel)
                        handlerSpc = curState.nameSpc;

                    var h = this.popHandlers[handlerSpc];
                    h.onPopstate(pageState, direction);
                }
    }
    function preventDefault(event) {
        if (event.preventDefault) {
            event.preventDefault();
        } else {
            event.returnValue = false;
        };
    }

    function fnPjax(option) {

        var args = Array.apply(null, arguments);
        args.shift();
        var internalReturn;

        this.each(function() {

            var $this = $(this);
            var dataName = "os.pjax";
            
            var cacheData = $this.data(dataName);
            var options = typeof option == "object" && option;

            if (!cacheData) {
                options = $.extend(true, {}, defaultOption, options);
                setDeepLevel(options.nameSpc);//  在初始化之前执行

                $this.data(dataName, (cacheData = new OSPjax(this, options)));
                addPopHandler(options.nameSpc, cacheData);
                return;
            }

            if (typeof option == "string" && typeof cacheData[option] == "function") {
                internalReturn = cacheData[option].apply(cacheData, args);
            } else {
                throw "请检查当前元素下是否已经绑定ospjax控件，或者当前调用方法是否不存在！";
            }
        });

        if (internalReturn !== undefined)
            return internalReturn;
        else
            return this;
    }


    function setDeepLevel(nameSpc) {
        var curLevel = window.ospjaxCurDeepLevel;

        if (!curLevel) {
            window.ospjaxCurDeepLevel = curLevel = 0;
            window.ospjaxNameSpcDeep = [];
        }

        // 不管存不存在直接重新设置值
        var level = curLevel + 1;
        window.ospjaxCurDeepLevel = window.ospjaxNameSpcDeep[nameSpc] = level;
        
        return level;
    }

    function getDeepLevel(nameSpc) {
        return window.ospjaxNameSpcDeep[nameSpc];
    }

    var isSupport = window.history &&
        window.history.pushState &&
        window.history.replaceState;

    if (isSupport) {
        var old = $.fn.ospjax;
        $.fn.ospjax = fnPjax;
        $.fn.ospjax.constructor = OSPjax;
        // 冲突控制权的回归处理
        $.fn.ospjax.noConflict = function() {
            $.fn.ospjax = old;
            return this;
        };
    }
}(window.jQuery);