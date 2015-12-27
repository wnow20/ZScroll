(function(w,$) {
    var doc = w.document;

    var defaults = {
        speed: 500,
        sleep: 1000,
        initialSlide: 0,
        pauseOnHover: true,
        vertical: false,
        infinite: true,

        autoPlay: false,
        autoPlaySpeed: 50,
        autoPlay_delay: 0,
        distance: 1,
        smooth: true,
        direction: 1,

        slideClass: '',

        debug: false,
    };

    /**
     * ZScroll插件构造函数
     * @param ele
     * @param options 这里的参数初始化后不能,自能主动修改,一定要通过Setter方法
     * @constructor
     */
    function ZScroll(ele, options) {
        var _ = this;

        _.ele = isString(ele)? get(ele) : ele;
        _.$ele = $(_.ele);
        _.options = extend({}, defaults, options);

        if (!_.options.debug) {
            console._debug = console._debug || console.debug;
            console.debug = noop;
        }

        // 生成尺寸位置属性&方法
        _.cssFactory();

        // 开始初始化
        _.isInitialized = false;
        _.init();

        if (_.options.autoPlay) {
            _.autoPlay();
        }
    }

    /**
     * 生成尺寸位置属性&方法
     */
    ZScroll.prototype.cssFactory = function () {
        var _ = this;
        console.debug('cssFactory()');

        // 尺寸属性
        _.PROP_DIM = _.options.vertical? 'height' : 'width';
        // 位置属性
        _.PROP_POSITION = _.options.vertical? 'top' : 'left';
        // 设置容器大小,只控制一边(高或宽),由 vertial 参数决定控制哪一边.
        _.genCssDim = ZScroll.genCSSObj(_.PROP_DIM);
        // 设置容器位置,只控制一边(top或left),由 vertial 参数决定控制哪一边.
        _.genCssPostion = ZScroll.genCSSObj(_.PROP_POSITION);
    };

    /**
     * 生成样式对象
     * @param cssProp 样式属性
     * @returns {*}
     */
    ZScroll.genCSSObj = function (cssProp) {
        console.debug('genCssDim(%s)', cssProp);
        var funcBody = '' +
            'console.debug(\'genCss -> \', { ' + cssProp + ': dimensions });' +
            'return { ' + cssProp + ': dimensions }';
        return new Function('dimensions', funcBody);
    };

    /**
     * 初始化
     */
    ZScroll.prototype.init = function () {
        var _ = this;
        console.debug('init()');
        if (_.isInitialized) {
            console.error('已经初始化,请不要重复初始化');
        }

        // 如果上下滚动
        if (_.options.vertical) {
            _.$ele.addClass('ZScroll-vertical');
        }

        // 幻灯片滚动进行时参数
        _.currentDirection = _.options.direction;
        _.currentOffset = 0;
        _.currentSlide = 0;


        // 幻灯片过少
        _.shortSlide = false;

        // 滚动参数
        _.Timer = null;
        _.animating = false;
        _.stepping = false;
        _.paused = false;
        _.isFirstLoop = true;

        // 申明私有元素参数,在 _buildWrap() 中被初始化
        _.$list = null; // 幻灯片可展示的父容器
        _.$track = null; // 幻灯片集合路径
        _.$slides = null; // 全部的幻灯片
        _.$first = null; // 第一张幻灯片
        _.$last = null; // 最后一张幻灯片

        // 申明用于无限循环的元素参数,在 _cloneSlide 中被初始化
        _.$slidesWithCloned = null; // 所有的幻灯片,包含克隆的
        _.$prefix = $(); // 前缀克隆幻灯片
        _.$suffix = $(); // 后缀克隆幻灯片

        _._buildWrap();
        _.count = _.$slides.length; // 幻灯片数量

        _._setupInfinite();
        _._initPosition();
        _._initEvents();

        _.minOffset = _._getLeft(_.count - 1, true); // 最小偏移量
        _.maxOffset = _._getLeft(0); // 最大偏移量

        // 初始化完毕
        _.$ele.addClass('ZScroll-initialized');
        _.isInitialized = true;
    };

    /**
     * 获取所有幻灯片尺寸之和
     */
    ZScroll.prototype._getAllDim = function () {
        var _ = this;
        console.debug('getAllDim()');

        var dim = 0;
        _.$slides.each(function (index, slide) {
            dim += _._getDim(slide);
        });

        return dim;
    };

    /**
     * 私有方法,生成本插件的DOM结构
     */
    ZScroll.prototype._buildWrap = function () {
        var _ = this;
        console.debug('生成插件的DOM结构 _buildWrap()');

        if (_.$ele.find('.ZScroll-list').length) {
            throw new Error('element had been initialized, don\'t initialize again');
        }

        _.$slides =
            _.$ele
                .children(_.options.slideClass + ':not(.item-cloned)')
                .addClass('ZScroll-item');

        _.$slides.each(function (index, slide) {
            $(slide).attr('data-slide-index', index);
        });

        _.$first = _.$slides.first();
        _.$last = _.$slides.last();

        _.$track = (_.$slides.length === 0) ?
            $('<div class="ZScroll-track"/>').appendTo(_.$ele)
            :
            _.$slides.wrapAll('<div class="ZScroll-track"/>').parent();

        _.$list = _.$track.wrap('<div class="ZScroll-list"/>').parent();
    };

    /**
     * 安装无限循环
     */
    ZScroll.prototype._setupInfinite = function () {
        var _ = this;
        console.debug('_setupInfinite');

        // 如果元素不够无需克隆
        if (_.$list[_.PROP_DIM]() > _._getAllDim()) {
            _.shortSlide = true;
            return false;
        }
        if (!_.options.infinite) {
            return false;
        }

        _._cloneSlide();
    };

    /**
     * 克隆幻灯片,用户无限滚动
     * @private
     */
    ZScroll.prototype._cloneSlide = function () {
        var _ = this;
        console.debug('_cloneSlide()');
        var vpDim = _.$list[_.PROP_DIM]();

        var pw = 0, nw = 0;
        var slide = null;
        var count = 0;
        for (var i = _.count - 1; pw < vpDim; i--) {
            slide = _.$slides.eq(i);
            slide
                .clone()
                .addClass('item-cloned item-cloned-up')
                .attr('data-slide-index', -(++count))
                .removeAttr('id')
                .prependTo(_.$track);
            pw += _._getDim(slide);
        }

        count = 0;
        for (var i = 0; nw < vpDim; i++) {
            slide = _.$slides.eq(i);
            slide
                .clone()
                .addClass('item-cloned item-cloned-down')
                .attr('data-slide-index', _.count + (count++))
                .removeAttr('id')
                .appendTo(_.$track);

            nw += _._getDim(slide);
        }

        _.$slidesWithCloned = _.$track.children();
        _.$prefix = _.$track.find('.item-cloned-up');
        _.$suffix = _.$track.find('.item-cloned-down');
    };

    /**
     * 初始化位置
     * @private
     */
    ZScroll.prototype._initPosition = function () {
        var _ = this;
        console.debug('初始化位置 _initPosition');

        var $children = _.$track.children();
        var totalDim = 0; // 总尺寸,包括克隆的幻灯片
        $children.each(function (index, child) {
            totalDim += _._getDim(child);
        });

        // TODO: bug: 当页面刚加载完的时候,有的图片还没有显示出来,过去不到真实的宽度
        _.$track.css(_.genCssDim(totalDim)); // 初始化幻灯片路径尺寸

        _.currentSlide = _.options.initialSlide; // 初始化当前幻灯片偏移


        if (_.options.direction === 1) {
            _.currentOffset = _._getLeft(_.currentSlide); // 初始化当前track偏移量
        } else {
            _.currentOffset = _._getLeft(_.currentSlide, true); // 初始化当前track偏移量
        }
        _.$track.css(_.genCssPostion(_.currentOffset));
    };

    /**
     * 初始化插件事件
     * @private
     */
    ZScroll.prototype._initEvents = function () {
        var _ = this;

        _.$list.on('mouseenter.ZScroll', $.proxy(_._setPaused, _, true));
        _.$list.on('mouseleave.ZScroll', $.proxy(_._setPaused, _, false));
    };

    /**
     * 获取指定幻灯片贴着可视框边时候的偏移量
     * ,值为你幻灯片的偏移量,从零开始,最大值是幻灯片数-1.
     * @param index
     * @param plusViewPort 算上可视框
     * @private
     */
    ZScroll.prototype._getLeft = function (index, plusViewPort) {
        var _ = this;
        console.debug('_getLeft(%s, %s)', index, plusViewPort);

        var dim = 0;
        _.$slides.each(function (i, slide) {
            if (i >= index) {
                return false;
            }

            dim += _._getDim(slide);
        });

        if (plusViewPort) {
            dim -= (_.$list[_.PROP_DIM]() - _._getDim(_.$slides.get(index)));
        }

        if (_.options.infinite) {
            dim += _._getPrefixDim();
        }

        return -dim;
    };

    /**
     * 获取前缀克隆幻灯片的总尺寸
     * @private
     */
    ZScroll.prototype._getPrefixDim = function () {
        var _ = this;
        console.debug('_getPrefixDim');

        var dim = 0;
        _.$prefix.each(function (index, slide) {
            dim += _._getDim(slide);
        });

        return dim;
    };

    /**
     * 获取后缀克隆幻灯片的总尺寸
     * @private
     */
    ZScroll.prototype._getSuffixDim = function () {
        var _ = this;
        console.debug('_getSuffixDim');

        var dim = 0;
        _.$suffix.each(function (index, slide) {
            dim += _._getDim(slide);
        });

        return dim;
    };

    /**
     * 获取指定幻灯片尺寸
     * @param ele
     * @private
     */
    ZScroll.prototype._getDim = function ($ele) {
        var _ = this;
        console.debug('_getDim -> ', $ele);

        $ele = ($ele instanceof Element)? $($ele) : $ele;

        return $ele[_.PROP_DIM]();
    };

    /**
     * 切换到上一张幻灯片,上→下,左→右
     */
    ZScroll.prototype.prev = function () {
        var _ = this;
        console.debug('prev()');

        _.slide(_.currentSlide - 1);
    };

    /**
     * 切换到下一张幻灯片,下→上,右→左
     */
    ZScroll.prototype.next = function () {
        var _ = this;
        console.debug('next()');

        _.slide(_.currentSlide + 1);
    };

    /**
     * 停止自动播放
     */
    ZScroll.prototype.pause = function () {
        console.debug('pause()');

        this._setPaused(true);
    };

    /**
     * 重新开始自动播放
     */
    ZScroll.prototype.resume = function () {
        console.debug('resume()');

        this._setPaused(false);
    };

    /**
     * 设置开始或暂停
     * @param paused
     * @private
     */
    ZScroll.prototype._setPaused = function (paused) {
        var _ = this;
        console.debug('_setPaused()');

        if (_.options.autoPlay && _.options.pauseOnHover) {
            _.paused = paused;
        }
    };

    /**
     * 开始自动播放
     * @issue 自动播放时,如果有人为接入切换,自动播放会坏掉
     */
    ZScroll.prototype.autoPlay = function () {
        var _ = this;
        console.debug('autoPlay()');

        _.autoPlayClear();

        var time = _.isFirstLoop? _.options.autoPlay_delay : _.options.sleep;
        console.debug(time);
        _.Timer = setTimeout(function() {
            var nextIndex = _.currentSlide + (_.options.direction === 1? 1 : -1);

            _.slide(nextIndex, function () {
                _.autoPlay();
            });
        }, time);
        _.isFirstLoop = false;
    };

    /**
     * 停止自动播放
     */
    ZScroll.prototype.autoPlayClear = function () {
        var _ = this;
        console.debug('autoPlayClear()');

        _.Timer && clearTimeout(_.Timer);
    };

    /**
     * 滚动到指定幻灯片,值为你幻灯片的偏移量,从零开始,最大值是幻灯片树-1.
     * @param index
     * @param callback
     */
    ZScroll.prototype.slide = function (index, callback) {
        var _ = this;
        console.debug('slide(%d)', index);

        var offset = 0;
        var originIndex = index;
        var isOverflow = index <0 || index >= _.count;
        var pvp = !_.currentDirection;

        index = _._transforIndex(index);

        if (_.shortSlide) {
            return false;
        }

        _._prevSlide(index);

        // 正在滚动则取消此次滚动行为
        if (_.animating) {
            return false;
        }

        _.autoPlayClear();

        offset = _._getLeft(index, pvp);

        if (!_.options.infinite) {
            if (isOverflow) {
                console.warn('指定偏移 > 幻灯片总数');
                return false;
            }

            // 出了右边界
            if (offset < _.minOffset) {
                offset = _.minOffset;
            }

            // 出了左边界
            if (offset > _.maxOffset) {
                offset = _.maxOffset;
            }
        }

        if (offset === _.currentOffset) {
            return false;
        }

        _.animating = true;
        _.slideTo(offset, function () {
            _.currentOffset = offset;
            _.currentSlide = index;
            _.animating =  false;

            _._postSlide();

            callback && callback();
        });
    };

    /**
     * 转化偏移index
     * @param index
     * @private
     */
    ZScroll.prototype._transforIndex = function (index) {
        var _ = this;
        console.debug('_transforIndex');

        while(index < 0) {
            index += _.count;
        }
        return index % _.count;
    };

    /**
     * 滚动指定偏移量
     * @param targetOffset
     * @param callback
     */
    ZScroll.prototype.slideTo = function (targetOffset, callback) {
        var _ = this;
        console.debug('slideTo(%s)', targetOffset);

        // 平滑滚动,用于自动播放
        _.smoothTimer = null;
        _.smoothTimerOffset = _.currentOffset;
        if (_.options.smooth) {
            _.smoothTimer = setInterval(function () {
                if (_.paused) {
                    return false;
                }
                _.smoothTimerOffset = nextStep();
                _.stepping = true;
                _.$track.css(_.genCssPostion(_.smoothTimerOffset));
                _.currentOffset = _.smoothTimerOffset;
                _.stepping = false;

                if (_.smoothTimerOffset === targetOffset) {
                    _.smoothTimer && clearInterval(_.smoothTimer);
                    callback && callback();
                }
            }, _.options.autoPlaySpeed);
        } else {
            _.$track.finish();
            _.$track.animate(_.genCssPostion(targetOffset), _.options.speed, function () {
                console.debug('animated');

                callback && callback();
            });
        }

        var sign = targetOffset - _.currentOffset > 0 ? 1 : -1;
        function nextStep() {
            console.debug('nextStep');
            var offset = _.currentOffset + sign * _.options.distance;

            // 越界处理
            if (sign === 1 && offset > targetOffset) {
                offset = targetOffset;
            }
            if (sign === -1 && offset < targetOffset) {
                offset = targetOffset;
            }


            return offset;
        }
    };


    /**
     * 移动结束之后干点什么
     * @param nextIndex 要走的下一个偏移
     * @private
     */
    ZScroll.prototype._postSlide = function () {
        var _ = this;
        console.debug('_postSlide()');

    };

    /**
     * 移动开始之前要干点什么
     * @private
     */
    ZScroll.prototype._prevSlide = function (nextIndex) {
        var _ = this;
        console.debug('_prevSlide()');

        if (_.options.infinite) {
            if (nextIndex === _.count - 1 && _.currentSlide === 0) {
                _.exchange();
                return true;
            }
            if (nextIndex === 0 && _.currentSlide === _.count - 1) {
                _.exchange();
                return true;
            }
        }
    };

    /**
     * 始末点互换
     */
    ZScroll.prototype.exchange = function () {
        var _ = this;
        console.debug('始末点互换 exchange()');

        var form = -1 * _._getPrefixDim();
        var to = _._getLeft(_.count - 1, true);

        if (_.currentOffset >= form) {
            _.currentOffset = _.currentOffset - _._getAllDim();
            _.$track.css(_.genCssPostion(_.currentOffset));
            console.debug('成功始末点互换');
            return ;
        }
        if (_.currentOffset <= to) {
            _.currentOffset = _.currentOffset + _._getAllDim();
            _.$track.css(_.genCssPostion(_.currentOffset));
            console.debug('成功始末点互换');
            return ;
        }
    };

    /**
     * 校对,参数更正
     * @description 一般窗口resize,添加或删除幻灯片后需要重新校对参数
     */
    ZScroll.prototype.reinit = function () {
        var _ = this;
        console.debug('reinit()');

    };

    /**
     * 清除所有对DOM的修改,不会删除自身对象
     */
    ZScroll.prototype.destroy = function () {
        var _ = this;
        console.debug('destroy()');

        _.$slides
            .removeClass('ZScroll-item')
            .removeAttr('data-slide-index')
            .appendTo(_.$ele);

        _.$ele.removeClass('ZScroll-initialized');

        _.$list.remove();
        _.isInitialized = false;
    };

    /**
     * 设置调试模式
     * @param boolean 不传或true,开启调试模式,否则则关闭天使模式
     * @returns {boolean}
     */
    ZScroll.prototype.debug = function (boolean) {
        if (!console._debug && console.debug === noop) {
            return false;
        }
        var debug = (console.debug !== noop)? console.debug : console._debug;

        if (boolean || 'undefined' === typeof boolean) {
            console.debug = debug;
            console.debug('成功开启调试模式!');
        } else {
            console._debug = console._debug || console.debug;
            console.debug = noop;
        }
    };

    w.ZScroll = w.ZScroll || ZScroll;

    /**
     * 设置ZScroll为jQuery插件
     */
    $.fn.extend({
        zScroll: function(options) {
            var _ = this,
                opt = arguments[0],
                args = Array.prototype.slice.call(arguments, 1),
                l = _.length,
                i,
                ret;

            for (i = 0; i < l; i++) {
                if (typeof opt === 'object' || typeof opt === 'undefined') {
                    _[i].zScroll = new ZScroll(_[i], opt);
                }
                if (_[i].zScroll && isString(opt)) {
                    ret = _[i].zScroll[opt].apply(_[i].zScroll, args);
                }
                if (typeof ret != 'undefined') return ret;
            }

            return _;
        }
    });

    /**
     * 合并一个或多个对象到第一个对象
     * @returns {*}
     */
    function extend() {
        var args = makeArray(arguments);

        if (args.length === 0) {
            return {};
        }
        if (args.length === 1) {
            return extend({}, args[0]);
        }

        var target = args[0];
        var option = args.slice(1);

        option.forEach(function (currentValue, index, array) {
            merge(target, currentValue);
        });

        return target;
    }

    /**
     * 合并两个对象
     * @param target {Object}
     * @param source {Object}
     */
    function merge(target, source) {
        for (var prop in source) {
            if (!source.hasOwnProperty(prop)) {
                continue ;
            }
            target[prop] = source[prop];
        }
    }

    /**
     * 接收 arguments 对象,返回 Array 对象
     * @param arguments {Array}
     * @returns {Array.<T>}
     */
    function makeArray(argu) {
        return Array.prototype.slice.call(argu);
    }

    /**
     * 判断变量是否为字符串
     * @param arg
     * @returns {boolean}
     */
    function isString(arg) {
        return Object.prototype.toString.call(arg) === '[object String]';
    }

    /**
     * 等于 document.getElementById
     * @param eleId
     * @returns {Element}
     */
    function get(eleId) {
        return doc.getElementById(eleId);
    }

    /**
     * 空方法
     */
    function noop() {}

}(window, jQuery || Zepto));
