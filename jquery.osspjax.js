+function ($) {
    var defaultOption = {
        push: true,
        replace: false,
        noQuery: false,

        // 客户端默认版本号
        clientVer: function () {
            return $("meta").filter(function () {
                var name = $(this).attr("http-equiv");
                return name && name.toLowerCase() === "oss-pjax-ver";
            }).attr("content");
        },


        wraper: "#oss-wraper",
        fragment: "osspjax-container",

        nameSpc: "oss-pjax",
        element: "a[oss-pjax-namespc='oss-pjax']",

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
        },
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
                        if (pageItem.hasAttribute("oss-pjax-global"))
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
            if (!sNode) return;

            const script = document.createElement("script");
            const attrs = sNode.attributes;
            for (let index = 0; index < attrs.length; index++) {
                const attr = attrs[index];
                script.setAttribute(attr.name, attr.value);
            }
            script.innerHTML = sNode.innerHTML;

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
                con.title = $content.attr("title");

            $content.hide();

            con.content = $content;
            con.version = xhr.getResponseHeader("oss-pjax-ver");
            con.url = url;

            return con;
        },

        _parseHTML: function (htmlString) {
            return $.parseHTML(htmlString, document, true);
        },
        filterAndFind: function ($ele, selecter) {
            return $ele.filter(selecter).add($ele.find(selecter));
        }
    };



    //  ===========  请求处理 Start ============

    // 终止请求
    function abortXHR(xhr) {
        if (xhr && xhr.readyState < 4) {
            xhr.onreadystatechange = $.noop;
            xhr.abort();
        }
    }

    // 去除url 的 hash值
    function stripHash(location) {
        return location.href.replace(/#.*/, "");
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

        return link.href;
    }

    // 如果启用了过滤参数，请求时去除query参数，适用于模板请求
    function getRealReqUrl(opt, url, ver) {
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

        return appVersionToUrl(_remote_url, ver);
    }

    function preventDefault(event) {
        if (event.preventDefault) {
            event.preventDefault();
        } else {
            event.returnValue = false;
        };
    }

    /**
    *  获取内容
    * @param {any} url 请求地址
    * @returns {any}  promise对象
    */
    function getContent(url, ossPjax) {
        const opt = ossPjax._option;
        // 附加数据，版本号处理
        const ver = exeClientVersion(opt.clientVer) || "1.0";

        const realUrl = getRealReqUrl(ossPjax._option, url, ver);
        const ajaxOpt = $.extend({}, { url: realUrl }, opt.ajaxSetting);

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
    };

    // 检测服务端返回版本信息
    function checkServerContentVsersion(ossPjax, con) {
        const cF = ossPjax._option.clientVer;
        var clientVer = exeClientVersion(cF);
        if (!clientVer) {
            ossPjax._option.clientVer = con.version;
            return;
        }

        //  版本不同，或者内容不存在
        if ((con.version && con.version !== clientVer) || !con.content) {
            forceTo(con.url, con.version);
        }
    }

    function exeClientVersion(clientVer) {
        typeof clientVer == "function" ? clientVer() : clientVer;
    }

    function forceTo(url, version) {
        window.location.href = appVersionToUrl(url, version);
    }

    function appVersionToUrl(url, v) {
        if (v) {
            if (url.indexOf("_opv=") > 0) {
                url = url.replace(/(_opv=).*?(&)/, "$1" + v + '$2');
            } else {
                if (url.indexOf("?") < 0)
                    url += "?_opv=" + v;
                else
                    url += "&_opv=" + v;
            }
        }
        return url;
    }


    function replaceContent(ossPjax, con) {
        var opt = ossPjax._option;
        var $wraper = $(opt.wraper);

        var $oldContainer = $wraper.find("." + opt.fragment);
        if ($.contains($oldContainer, document.activeElement)) {
            try {
                document.activeElement.blur();
            } catch (e) { }
        }
        // 替换标题
        if (con.title && (opt.push || opt.replace))
            document.title = con.title;
        // 清理目标
        opt.methods.removeOld($oldContainer);
        // 追加新内容
        $wraper.append(con.content);
        // 过滤安装脚本
        pjaxHtmlHelper.filterScripts(con, opt);
        // 展示
        opt.methods.showNew(con.content);
    }
    //  ===========  请求处理 end ============

    const OssPjax = function ($ele, opt) {
        var self = this;
        self._option = opt;

        // 设置初始页的页面状态值
        var firstState = setPageState(self, null, null);
        if (opt.push || opt.replace)
            window.history.replaceState(firstState, firstState.title, firstState.url);

        $ele.on("click.pjax" + opt.nameSpc.replace(".", "_"), opt.element, function (event) {
            self.click(event);
        });
    };

    // 实例属性： state 是当前页面信息，   xhr 远程请求实体信息
    // 原型属性： haveSysVerCheck  是否已经开启服务器版本检查
    OssPjax.prototype = {
        click: function (event) {
            var url = formatLinkEvent(event);
            if (!url)
                return;

            this._option.methods.click(event);
            if (event.isDefaultPrevented())
                return;

            this.goTo(url);
            preventDefault(event);
        },

        goTo: function (url) {
            this._interGoTo(url);
        },

        /**
         * 获取或者设置当前的页面State
         * @param {any} action 动作
         * @param {any} state 页面对像
         * @returns {any} 如果指定动作和对象不为空，返回操作成功与否。否则返回当前页面对象
         */
        state: function (action, state) {
            if (action && state && state.url) {
                if (action === "pushState") {
                    window.history.pushState(state, state.title, state.url);
                } else {
                    window.history.replaceState(state, state.title, state.url);
                }
                setPageState(this, null, state);
                return true;
            }
            return this._pageState;
        },

        forceTo: function (url) {
            forceTo(url);
        },

        _pageState: null,
        _deepLevel: 0,
        _sysVerCheckCount: 0,
        _option: null, // 用来保存配置信息
        _xhr: null, // 保存请求中信息

        _interGoTo: function (url, popedState) {
            const ossPjax = this;
            getContent(url, ossPjax).done(function (con) {
                checkServerContentVsersion(ossPjax, con);
                const opt = ossPjax._option;

                if (!popedState) {
                    // 正常浏览器请求
                    if (opt.push || opt.replace) {
                        const newState = setPageState(ossPjax, con);
                        if (opt.push)
                            window.history.pushState(newState, newState.title, newState.url);
                        else if (opt.replace)
                            window.history.replaceState(newState, newState.title, newState.url);
                    }
                } else {
                    setPageState(ossPjax, null, popedState);
                }
                replaceContent(ossPjax, con);

            }).fail(function (errMsg, textStatus, hr) {
                forceTo(url);
            });
        }
    };


    //  =============  页面State及事件处理 Start ============

    function setPageState(instance, newContent, state) {
        if (!state) {
            if (!newContent) {
                //isFirstInitail = true;
                state = createState({}, instance._option.nameSpc);
            } else {
                state = createState(newContent, instance._option.nameSpc);
            }
            state._deepLevel = getDeepLevel(instance._option.nameSpc);
        }
        return window._oss_pjax_PageState = instance._pageState = state;
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

    function addPopHandler(nameSpc, handler) {

        if (!this.popHandlers)
            this.popHandlers = [];

        this.popHandlers[nameSpc] = handler;

        if (!this.onPopstateTriger)
            window.onpopstate = this.onPopstateTriger = function (event) {
                let pageState = event.state;
                if (!pageState) return;

                let handlerSpc = pageState.nameSpc;
                let curState = window._oss_pjax_PageState;

                if (pageState.nameSpc !== curState.nameSpc
                    && pageState._deepLevel > curState._deepLevel)
                    handlerSpc = curState.nameSpc;

                const h = this.popHandlers[handlerSpc];
                Popstate(h, pageState);
            }
    }

    /**
     * 浏览器回退前进
     * @param {} state 
     */
    function Popstate(ossInstance, state) {
        if (state && state.url) {
            ossInstance._interGoTo(state.url, state);
        };
    }

    //  =============  页面State处理 End ============

    function fnPjax(option) {



        const $this = this;
        const dataName = "oss.pjax";

        let cacheData = $this.data(dataName);
        if (typeof option == "object") {
            if (!cacheData) {

                const mOptions = $.extend(true, {}, defaultOption, option);

                setDeepLevel(mOptions.nameSpc); //  在初始化之前执行
                $this.data(dataName, (cacheData = new OssPjax($this, mOptions)));

                addPopHandler(mOptions.nameSpc, cacheData);

                return cacheData;
            } else {
                throw "方法不存在，或者命名空间" + cacheData._option.nameSpc + "已经在当前元素挂载osspjax控件！";
            }
        }
        else if (typeof option == "string") {

            const args = Array.apply(null, arguments);
            args.shift();

            if (cacheData && typeof cacheData[option] == "function") {
                return cacheData[option].apply(cacheData, args);
            }
            else if (!cacheData && option == "state") {
                return false;
            }
        }
        return this;
    }


    function setDeepLevel(nameSpc) {
        var curLevel = window._oss_pjax_CurDeepLevel;

        if (!curLevel) {
            window._oss_pjax_CurDeepLevel = curLevel = 0;
            window._oss_pjax_NameSpcDeep = [];
        }

        // 不管存不存在直接重新设置值
        var level = curLevel + 1;
        window._oss_pjax_CurDeepLevel = window._oss_pjax_NameSpcDeep[nameSpc] = level;

        return level;
    }

    function getDeepLevel(nameSpc) {
        return window._oss_pjax_NameSpcDeep[nameSpc];
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