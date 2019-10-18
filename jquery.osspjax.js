+function ($) {
    var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,
        animation:true,  //  是否开启动画，  单独元素可以添加 noanimation 属性

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
                $newContainer.show(200);
                afterShow();
            },
            
            /**
             * 结束事件
             * @param {any} newState 新的页面状态
             */
            complete: function(newState) {}
        }
    };

    var pjaxHtmlHelper = {
        /**
         *    *  去掉页面中已经重复的js和css文件   
         * @param {any} con  内容对象
         * @param {any} opt  实例选项
         */
        filterRepeatCssScripts: function (con, opt) {
            // 清除上个页面相关js，css 内容
            $("head").find("[pjax-temp-tag='" + opt.nameSpc + "'").remove();

            var pageScripts = $('script');
            con.scripts = this._filterAndSetAttr(con.scripts, pageScripts, opt.nameSpc,"src");

            var pageCssLinks = $("head").find("link[rel='stylesheet'],style");
            con.css = this._filterAndSetAttr(con.css, pageCssLinks, opt.nameSpc, "href");
        },
        _filterAndSetAttr: function(newList, pageList, nameSpc, attrName) {
            var resList = newList.filter(function() {

                var nId = this[attrName] || this.id || this.innerText;
                for (var i = 0; i < pageList.length; i++) {

                    var pCssItem = pageList[i];
                    var pCssId = pCssItem[attrName] || pCssItem.id || pCssItem.innerText;

                    if (nId === pCssId) {
                        return false;
                    }
                }
                return true;
            });
            resList.attr("pjax-temp-tag", nameSpc);
            return resList;
        },
    
        //addNewCss: function (con, opt) {
        //    con.css.each(function () {
        //        document.head.appendChild(this);
        //    });
        //},
        addNewScript: function(con, opt) {
            con.scripts.each(function() {

                var script = document.createElement('script');
                var src = this.src;
                if (src) {
                    script.src = src;
                } else {
                    script.innerHTML = $(this).html();
                }
                script.id = this.id;
                var type = this["type"];
                if (type) script.type = type;

                script.setAttribute("pjax-temp-tag", $(this).attr("pjax-temp-tag"));
                document.head.appendChild(script);
            });
        },

        /**
         * 格式化内容
         * @param {any} html 原始html
         * @param {any} opt pjax实例选项
         * @param {any} req 请求信息
         * @param {any} xhr 请求xmlhttprequest
         * @returns {any} 格式化后的内容对象
         */
        formatContent: function(html, opt, req, xhr) {


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

                $content = $body.filter("." + opt.fragment).add($body.find("." + opt.fragment)).first();
                if (!$content.length) {

                    $content = $("<div class='" + opt.fragment + "' style='display:none'></div>");
                    $content.append($body);
                }

            } else {
                $html = $(this._parseHTML(html));
                $content = $html.filter("." + opt.fragment).add($html.find("." + opt.fragment)).first();
                if (!$content.length) {
                    $html = $("<div class='" + opt.fragment + "' style='display:none'></div>").append($html);
                    $content = $html;
                }
            }

            con.content = $content;
            con.title = $html.find("title").last().remove().text();
            con.scripts = $html.find("script").remove();
            con.css = $html.find("link[rel='stylesheet'],style").remove();

            if (!con.title)
                con.title = $content.attr("title") || $content.data("title") || req.title;

            con.version = xhr.getResponseHeader("X-PJAX-Ver");
            con.url = req.url;

            return con;
        },
        _parseHTML: function(htmlString) {
            return $.parseHTML(htmlString, document, true);
        },
        /**
         *  查找头部meta的版本信息
         * @returns {any} 头信息中的版本号
         */
        findVersion: function() {
            return $("meta").filter(function() {
                var name = $(this).attr("http-equiv");
                return name && name.toLowerCase() === "app-version";
            }).attr("content");
        }
    };

    var OssPjax = function(element, opt) {
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
    OssPjax.prototype = {
        click: function(event) {
            var req = formatLinkEvent(event);
            if (!req)
                return;

            this.opt.methods.click(event);
            if (event.isDefaultPrevented())
                return;

            this.goTo(req);
            preventDefault(event);
        },
        forceTo: function(url) {
            window.location.href = url;
        },
        /**
         * 根据请求转移到指定页面
         * @param {any} req { url:"", title: "", popDirection: 0, popState: null, no_animation:false}
         */
        goTo: function(req) {
            var ossPjax = this;

            //  处理请求地址参数
            setReqUrl(ossPjax.opt, req);

            ossPjax.getContent(req).done(function(con) {
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

                var animation = opt.animation && !req.no_animation;
                ossPjax.replaceContent(con, animation);

            }).fail(function(errMsg, textStatus, hr) {
                ossPjax.opt.methods.remoteError(errMsg, textStatus, hr);
            });
        },

        replaceContent: function(con, animation) {
            var ossPjax = this;
            var opt = ossPjax.opt;

            var $wraper = $(opt.wraper);
            
            var $oldContainer = $wraper.find("." + opt.fragment);
            if ($.contains($oldContainer, document.activeElement)) {
                try {
                    document.activeElement.blur();
                } catch (e) {}
            }

            opt.methods.removeOld($oldContainer);    
            pjaxHtmlHelper.filterRepeatCssScripts(con,opt);
            
            $wraper.append(con.css);
            $wraper.append(con.content);
            pjaxHtmlHelper.addNewScript(con, opt);

            opt.methods.showNew(con.content, function() {
                opt.methods.complete(ossPjax.pageState);
            });
        },
        /**
         *  获取内容
         * @param {any} req 请求信息
         * @returns {any}  promise对象
         */
        getContent: function(req) {
            var ossPjax = this;
            var opt = ossPjax.opt;

            var ajaxOpt = $.extend({}, { url: req.remote_url }, opt.ajaxSetting);

            // 附加数据，版本号处理
            var ver = typeof ossPjax.sysOpt.version == "function" ? ossPjax.sysOpt.version() : ossPjax.sysOpt.version;

            //  todo  可以添加页面级缓存，并和当前版本号比较（非必要）
            if (!ajaxOpt.data) ajaxOpt.data = {}
            if ($.isArray(ajaxOpt.data)) {
                ajaxOpt.data.push({ name: "_pav", value: ver });
            } else {
                ajaxOpt.data._pav = ver;
            }

            abortXHR(ossPjax.xhr);
            opt.methods.beforeRemote(ajaxOpt); //  加载之前触发事件

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
            ossPjax.xhr = $.ajax(ajaxOpt).done(function(resData, textStatus, hr) {
                var filterRes = !opt.methods.resultFilter ? resData : opt.methods.resultFilter(resData, textStatus, hr);
                if (!filterRes) {
                    defer.reject(resData, textStatus, hr);
                } else {
                    var con = pjaxHtmlHelper.formatContent(filterRes, opt, req, hr);                    
                    defer.resolve(con);
                }
            }).fail(function(hr, textStatus, errMsg) {
                defer.reject(errMsg, textStatus, hr);
            });

            return defer.promise();
        },

        onPopstate: function(state, direction) {
            if (state && state.url) {
                this.goTo({ url: state.url, title: state.title, popDirection: direction, popState: state });
            };
        },

        /**
         * 获取或者设置当前的页面State
         * @param {any} action 动作
         * @param {any} state 页面对像
         * @returns {any} 如果指定动作和对象不为空，返回操作成功与否。否则返回当前页面对象
         */
        state: function(action, state) {
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
            checkVer: false,
            serverUrl: "",
            version: pjaxHtmlHelper.findVersion,
            type: "GET",
            intervalMins: 10
        },

        /**
         *   设置系统级变量信息，如版本号等
         * @param {} opt 
         * @returns {} 
         */
        sysVer: function(opt) {
            var ossPjax = this;

            if (!!opt) {
                $.extend(ossPjax.sysOpt, opt);
                if (ossPjax.sysOpt.checkVer && ossPjax.sysVerCheckCount === 0) {
                    // 初始化五分钟后开始首次检测  0- 首次传入时间间隔
                    setTimeout(function() { checkServerVersion(ossPjax, 0); }, 5 * 60 * 1000);
                }
                return true;
            }
            return ossPjax.SysOpt;
        },
        sysVerCheckCount: 0
    };

  
    /**
     *  检查服务器版本
     * @param {any} ossPjax
     * @param {any} mins
     */
    function checkServerVersion(ossPjax, mins) {
        var opt = ossPjax.sysOpt;

        // 如果第一次加载，使用设置默认时间间隔
        mins = mins === 0 ? opt.intervalMins : mins;
        ossPjax.sysVerCheckCount += 1;

        $.ajax({ url: opt.serverUrl, type: opt.type })
            .done(function (v) {
                var curVer = typeof ossPjax.sysOpt.version == "function" ? ossPjax.sysOpt.version() : ossPjax.sysOpt.version;
                if (v !== curVer) {
                    window.location.href = formatUrlWithVersion(location.href, v);
                }
                if (mins < 20) mins += 1;
            })
            .fail(function() {
                if (mins > 8) mins -= 1;
            }).always(function () {
                setTimeout(function() { checkServerVersion(ossPjax, mins); }, mins * 60 * 1000);
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
        return window.osspjaxCurPageState = instance.pageState = state;
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

                $this.data(dataName, (cacheData = new OssPjax(this, options)));
                addPopHandler(options.nameSpc, cacheData);
                return;
            }

            if (typeof option == "string" && typeof cacheData[option] == "function") {
                internalReturn = cacheData[option].apply(cacheData, args);
            } else {
                throw "请检查当前元素下是否已经绑定osspjax控件，或者当前调用方法是否不存在！";
            }
        });

        if (internalReturn !== undefined)
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
        var old = $.fn.osspjax;

        $.fn.osspjax = fnPjax;
        $.fn.osspjax.constructor = OssPjax;
        // 冲突控制权的回归处理
        $.fn.osspjax.noConflict = function() {
            $.fn.osspjax = old;
            return this;
        };
    }
}(window.jQuery);