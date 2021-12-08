+function ($) {
    var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,

        nameSpc: "oss-pjax",
        wraper: "#oss-wraper",
        fragment: "osspjax-container",

        ajaxSetting: {
            timeout: 0,
            type: "GET",
            dataType: "html"
        },

        methods: {
            /**
             *  点击事件，   可以通过 event.preventDefault()取消后续执行
             * @param {any} event 触发事件对象
             */
            click: function (event) { },

            /**
             * 移除旧容器，可添加动画
             * @param {any} $oldContainer 旧容器（jquery对象）
             */
            removeOld: function ($oldContainer) {
                $oldContainer.remove();
            },

            /**
             * 显示新容器
             * @param {any} $newContainer 新容器（jquery对象）
             */
            showNew: function ($newContainer) {
                $newContainer.show("slow");
            },
        }
    };

    const pjaxHtmlHelper = {
        /**
         *    *  去掉页面中已经重复的js和css文件   
         * @param {any} con  内容对象
         * @param {any} opt  实例选项
         */
        filterScripts: function (con, opt) {
            // 清除上个页面相关js，css 内容
            $("script[oss-pjax-namespc='" + opt.nameSpc + "']").remove();

            var pageScripts = $('script');

            con.scripts.each(function () {

                var nConItem = this;
                var nId = nConItem["src"] || nConItem.id || nConItem.innerText;

                for (var i = 0; i < pageScripts.length; i++) {

                    var pageItem = pageScripts[i];
                    var pageId = pageItem["src"] || pageItem.id || pageItem.innerText;

                    if (nId === pageId) {
                        if(pageItem.hasAttribute("oss-pjax-global"))
                            return;

                        console.info("请求页面地址:" + con.url + " 包含了已经存在的" + pageId + " js文件/代码,将会重新加载！");
                        pageItem.parentNode.removeChild(pageItem);
                    }
                }

                if (!nConItem.hasAttribute("oss-pjax-namespc")) {
                    nConItem.setAttribute("oss-pjax-namespc", opt.nameSpc);
                }
                pjaxHtmlHelper.installScript(nConItem);
            });
        },

        /**
         * 原生追加js方法（不使用jquery append方式）
         * @param  sNode 
         * @returns 
         */
        installScript: function (sNode) {
            if(!sNode) return;

            const script = document.createElement("script");
            const attrs=sNode.attributes;
            for (let index = 0; index < attrs.length; index++) {
                const attr = attrs[index];
                script.setAttribute(attr.name,attr.value);  
            }  
            document.body.appendChild(script);
        },

        /**
         * 格式化内容
         * @param {any} html 原始html
         * @param {any} opt pjax实例选项
         * @param {any} xhr 请求xmlhttprequest
         * @returns {any} 格式化后的内容对象
         */
        formatContent: function (html, opt, url, xhr) {

            var con = { origin: html, isFull: /<html/i.test(html) };
            var $html = null, $content = null;

            if (con.isFull) {

                $html = $("<div></div>");

                var head = html.match(/<head[^>]*>([\s\S.]*)<\/head>/i);
                if (head) {
                    $html.append($(this._parseHTML(head[0])));
                }
                var $body = $(this._parseHTML(html.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[0]));
                $html.append($body);

                $content = this.filterAndFind($body, "." + opt.fragment).first();// $body.filter("." + opt.fragment).add($body.find("." + opt.fragment)).first();
                if (!$content.length) {
                    $content = $("<div class='" + opt.fragment + "'></div>");
                    $content.append($body);
                }

            } else {
                $html = $(this._parseHTML(html));

                $content = this.filterAndFind($html, "." + opt.fragment).first();// $html.filter("." + opt.fragment).add($html.find("." + opt.fragment)).first();
                if (!$content.length) {
                    $html = $("<div class='" + opt.fragment + "'></div>").append($html);
                    $content = $html;
                }
            }

            con.title = this.filterAndFind($html, "title").last().remove().text();//$html.find("title").last().remove().text();
            con.scripts = this.filterAndFind($html, "script").remove();// $html.find("script").remove();

            if (!con.title)
                con.title = $content.attr("title") ;

            $content.hide();

            con.content = $content;
            con.version = xhr.getResponseHeader("oss-pjax-ver");
            con.url = url;

            return con;
        },

        _parseHTML: function (htmlString) {
            return $.parseHTML(htmlString, document, true);
        },

        /**
         *  查找头部meta的版本信息
         * @returns {any} 头信息中的版本号
         */
        findVersion: function () {
            return $("meta").filter(function () {
                var name = $(this).attr("http-equiv");
                return name && name.toLowerCase() === "app-version";
            }).attr("content");
        },
        filterAndFind: function ($ele, selecter) {
            return $ele.filter(selecter).add($ele.find(selecter));
        }
    };

    var OssPjax = function (element, opt) {
        var self = this;
        self.opt = opt;

        // 设置初始页的页面状态值
        var firstState = setPageState(self,null,null);
        if (opt.push || opt.replace)
            window.history.replaceState(firstState, firstState.title, firstState.url);

        $(element).on("click.pjax" + opt.nameSpc.replace(".", "_"), "a[oss-pjax-namespc='" + opt.nameSpc + "']",
            function (event) {
                self.click(event);
            });
    };
    // 实例属性： state 是当前页面信息，   xhr 远程请求实体信息
    // 原型属性： haveSysVerCheck  是否已经开启服务器版本检查
    OssPjax.prototype = {
        click: function (event) {
            var req = formatLinkEvent(event);
            if (!req)
                return;

            this.opt.methods.click(event);
            if (event.isDefaultPrevented())
                return;

            this.goTo(req);
            preventDefault(event); 
        },

        /**
         * 根据请求转移到指定页面
         * @param {any} req { url:"",  popState: null}
         */
        goTo: function (req) {
            var ossPjax = this;
            ossPjax.getContent(req.url).done(function (con) {
                checkContentVsersion(ossPjax.sysOpt, con);
                var opt = ossPjax.opt;

                if (!req.popState) {
                    if (opt.push || opt.replace) {
                        var newState = setPageState(ossPjax, con);
                        if (opt.push)
                            window.history.pushState(newState, newState.title, newState.url);
                        else if (opt.replace)
                            window.history.replaceState(newState, newState.title, newState.url);
                    }
                } else {
                    setPageState(ossPjax, null, req.popState);
                }

                if (con.title && (opt.push || opt.replace))
                    document.title = con.title;

                ossPjax.replaceContent(con);

            }).fail(function (errMsg, textStatus, hr) {
                ossPjax.forceTo(req.url);
            });
        },

        replaceContent: function (con) {
            var ossPjax = this;
            var opt = ossPjax.opt;

            var $wraper = $(opt.wraper);

            var $oldContainer = $wraper.find("." + opt.fragment);
            if ($.contains($oldContainer, document.activeElement)) {
                try {
                    document.activeElement.blur();
                } catch (e) { }
            }

            opt.methods.removeOld($oldContainer);
            $wraper.append(con.content);

            pjaxHtmlHelper.filterScripts(con, opt);
            opt.methods.showNew(con.content);
        },

        /**
         *  获取内容
         * @param {any} url 请求地址
         * @returns {any}  promise对象
         */
        getContent: function (url) {
            var ossPjax = this;
            var opt = ossPjax.opt;

            const realUrl = setReqUrl(ossPjax.opt, url);

            var ajaxOpt = $.extend({}, { url: realUrl }, opt.ajaxSetting);

            // 附加数据，版本号处理
            var ver = findPjaxClientVersion(ossPjax.sysOpt) || "1.0";

            //  todo  可以添加页面级缓存，并和当前版本号比较（非必要）
            if (!ajaxOpt.data) ajaxOpt.data = {}
            if ($.isArray(ajaxOpt.data)) {
                ajaxOpt.data.push({ name: "_pav", value: ver });
            } else {
                ajaxOpt.data._pav = ver;
            }

            abortXHR(ossPjax._xhr);

            //  处理ajax的beforeSend
            var oldBeforEvent = ajaxOpt.beforeSend;
            ajaxOpt.beforeSend = function (x) {
                x.setRequestHeader("oss-pjax-ver", ver);
                x.setRequestHeader("oss-pjax", opt.nameSpc);

                if (oldBeforEvent && typeof oldBeforEvent == "function") {
                    oldBeforEvent();
                }
            }
            var defer = $.Deferred();
            ossPjax._xhr = $.ajax(ajaxOpt).done(function (resData, textStatus, hr) {

                var con = pjaxHtmlHelper.formatContent(resData, opt, url, hr);
                defer.resolve(con);

            }).fail(function (hr, textStatus, errMsg) {
                defer.reject(errMsg, textStatus, hr);
            });

            return defer.promise();
        },

        onPopstate: function (state, direction) {
            if (state && state.url) {
                this.goTo({ url: state.url, title: state.title,  popState: state });
            };
        },

        /**
         * 获取或者设置当前的页面State
         * @param {any} action 动作
         * @param {any} state 页面对像
         * @returns {any} 如果指定动作和对象不为空，返回操作成功与否。否则返回当前页面对象
         */
        state: function (action, state) {
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

        forceTo: function (url) {
            window.location.href = url;
        },

        sysOpt: {
            version: pjaxHtmlHelper.findVersion, // 客户端默认版本号
            checkVer: false, // 默认关闭服务端检测
            serverUrl: "", // 服务端接口地址，直接返回 如：1.0.0
            type: "GET", // 服务端接口请求地址
            intervalMins: 15 // 第一次默认检测间隔时间
        },

        /**
         *   设置系统级变量信息，如版本号等
         * @param {any} opt  实例选项
         * @returns {any} 当前实例选项信息
         */
        sysVer: function (opt) {
            var ossPjax = this;

            if (opt) {
                $.extend(ossPjax.sysOpt, opt);
                if (ossPjax.sysOpt.checkVer && ossPjax.sysVerCheckCount === 0) {
                    // 定时开始首次检测  
                    checkServerVersion(ossPjax, 0);
                }
                return true;
            }
            return ossPjax.SysOpt;
        },
        sysVerCheckCount: 0
    };


    ///**
    // *  检查服务器版本
    // * @param {any} ossPjax
    // * @param {any} mins
    // */
    function checkServerVersion(ossPjax, mins) {
        var opt = ossPjax.sysOpt;
        if (!opt.version)
            return;

        if (mins === 0) {
            mins = opt.intervalMins;
            setTimeout(function () { checkServerVersion(ossPjax, mins); }, mins * 60 * 1000);
            return;
        }

        ossPjax.sysVerCheckCount += 1;
        $.ajax({ url: opt.serverUrl, type: opt.type })
            .done(function (v) {
                if (v !== findPjaxClientVersion(opt)) {
                    window.location.href = formatUrlWithVersion(location.href, v);
                }
                if (mins < 20) mins += 1;
            })
            .fail(function () {
                if (mins > 8) mins -= 1;
            }).always(function () {
                setTimeout(function () { checkServerVersion(ossPjax, mins); }, mins * 60 * 1000);
            });
    }
    function checkContentVsersion(sysOpt, con) {
        // 附加数据，版本号处理
        var clientVer = findPjaxClientVersion(sysOpt);
        if (!clientVer) {
            sysOpt.version = con.version;
            return;
        }

        //  版本不同，或者内容不存在
        if ((con.version && con.version !== clientVer)
            || !con.content) {
            window.location.href = formatUrlWithVersion(con.url, con.version);
        }
    }

    function findPjaxClientVersion(verOpt) {
        typeof verOpt.version == "function" ? verOpt.version() : verOpt.version;
    }
    function formatUrlWithVersion(url, v) {
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


 
    function setPageState(instance, newContent, state) {
        if (!state) {
            if (!newContent) {
                //isFirstInitail = true;
                state = createState({}, instance.opt.nameSpc);
            } else {
                state = createState(newContent, instance.opt.nameSpc);
            }
            state._deepLevel = getDeepLevel(instance.opt.nameSpc);
        }
        return window.osspjaxCurPageState = instance.pageState = state;
    }
       /**
     * 创建页面置换状态
     * @param {any} title
     * @param {any} url
     */
        function createState(newContent, nameSpc) {
            var newState = {
                id: new Date().getTime(),
                nameSpc: nameSpc,
                title: newContent.title || document.title,
                url: newContent.url || document.URL
            };
            return newState;
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
    *  验证链接
    * @param {any} event   链接元素
     * @return  false-停止Pjax，执行原生。   {} Pjax执行需要的地址信息
    */
    function formatLinkEvent(event) {
        var link = event.currentTarget;
        if (!link)
            return false;

        if (link.tagName.toUpperCase() !== "A")
            throw "osspjax click event requires an anchor element";

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
            url: link.href
        };
    }

    /**
     *  如果启用了过滤参数，请求时去除query参数，适用于模板请求
     * @param {any} opt
     * @param {any} req
     */
    function setReqUrl(opt, url) {

        var q = opt.noQuery;
        let _remote_url;

        if (q) {

            if (typeof q === "function") {
                _remote_url = q(url);
            } else {
                var index = url.indexOf("?");
                if (index > 0)
                    _remote_url = url.substring(0, index);
            }
        }

        if (!_remote_url)
            _remote_url = url;

        return _remote_url;
    }

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
                    var curState = window.osspjaxCurPageState;
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

        const args = Array.apply(null, arguments);
        args.shift();

        let internalReturn;
        this.each(function () {

            const $this = $(this);
            const dataName = "oss.pjax";

            let cacheData = $this.data(dataName);
            if(typeof option == "object"){
                if (!cacheData) {
                    const options = $.extend(true, {}, defaultOption, option);

                    setDeepLevel(options.nameSpc);//  在初始化之前执行
    
                    $this.data(dataName, (cacheData = new OssPjax(this, options)));
                    addPopHandler(options.nameSpc, cacheData);
                    return;
                }else {
                    throw "请检查当前元素(" + options.wraper + ")下是否已经绑定osspjax控件，或者当前调用方法是否不存在！";
                }
            }          
            else if (typeof option == "string" ) {
                if (cacheData && typeof cacheData[option] == "function") {
                    internalReturn = cacheData[option].apply(cacheData, args); 
                }            
            } 
        });

        if (internalReturn)
            return internalReturn;
        else
            return this;
    }


    function setDeepLevel(nameSpc) {
        var curLevel = window.osspjaxCurDeepLevel;

        if (!curLevel) {
            window.osspjaxCurDeepLevel = curLevel = 0;
            window.osspjaxNameSpcDeep = [];
        }

        // 不管存不存在直接重新设置值
        var level = curLevel + 1;
        window.osspjaxCurDeepLevel = window.osspjaxNameSpcDeep[nameSpc] = level;

        return level;
    }

    function getDeepLevel(nameSpc) {
        return window.osspjaxNameSpcDeep[nameSpc];
    }

    var isSupport = window.history &&
        window.history.pushState &&
        window.history.replaceState;

    if (isSupport) {
        var oldOssPjax = $.fn.osspjax;

        $.fn.osspjax = fnPjax;
        $.fn.osspjax.constructor = OssPjax;
        // 冲突控制权的回归处理
        $.fn.osspjax.noConflict = function () {
            $.fn.osspjax = oldOssPjax;
            return this;
        };
    }
}(window.jQuery);