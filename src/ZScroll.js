(function(w,$) {
    var doc = w.document;

    var defaults = {
        speed: 500,
        sleep: 2000,
        direction: 1,
        initialSlide: 0,
        pauseOnHover: true,
        vertical: false,

        autoPlay: true,
        autoPlaySpeed: 50,
        autoPlay_delay: 0,
        infinite: true,
        distance: 1,
        smooth: true,
        smooth_distance: 1,
        //centerMode: false,

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
            'console.log(\'genCss -> \', { ' + cssProp + ': dimensions });' +
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

        _.currentDirection = _.direction;
        _.currentOffset = 0;
        _.currentSlide = 0;

        // 申明私有元素参数,在 _._buildWrap() 中被初始化
        _.$list = null; // 幻灯片可展示的父容器
        _.$track = null; // 幻灯片集合路径
        _.$slides = null; // 全部的幻灯片
        _.$first = null; // 第一张幻灯片
        _.$last = null; // 最后一张幻灯片

        _._buildWrap();
        _._initPosition();

        _.count = _.$slides.length; // 幻灯片数量
        _.minOffset = _._getLeft(0); // 最小偏移量
        _.maxOffset = _._getLeft(_.count - 1, true); // 最大偏移量

        // 初始化完毕
        _.$ele.addClass('ZScroll-initialized');
        _.isInitialized = true;
    };

    /**
     * 私有方法,生成本插件的DOM结构
     */
    ZScroll.prototype._buildWrap = function () {
        var _ = this;
        console.debug('生成插件的DOM结构 _buildWrap()');

        if (_.$ele.find('.ZScroll-list').length) {
            console.error('element had been initialized, don\'t initialize again');
        }

        _.$slides =
            _.$ele
                .children(_.options.slideClass + ':not(.item-cloned)')
                .addClass('ZScroll-item');

        _.$first = _.$slides.first();
        _.$last = _.$slides.last();

        _.$track = (_.$slides.length === 0) ?
            $('<div class="ZScroll-track"/>').appendTo(_.$ele)
            :
            _.$slides.wrapAll('<div class="ZScroll-track"/>').parent();

        _.$list = _.$track.wrap('<div class="ZScroll-list"/>').parent();

        _.$first
            .clone()
            .addClass('item-cloned')
            .removeAttr('id')
            .appendTo(_.$track);

        _.$last
            .clone()
            .addClass('item-cloned')
            .removeAttr('id')
            .prependTo(_.$track);
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

        _.$track.css(_.genCssDim(totalDim)); // 初始化幻灯片路径尺寸

        _.currentSlide = _.options.initialSlide; // 初始化当前幻灯片偏移
        _.currentOffset = _._getLeft(_.currentSlide); // 初始化当前track偏移量
        _.$track.css(_.genCssPostion(_.currentOffset));

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

        dim += _.$first[_.PROP_DIM]();

        return -dim;
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
     * 滚动到指定幻灯片,值为你幻灯片的偏移量,从零开始,最大值是幻灯片树-1.
     * @param index
     */
    ZScroll.prototype.slide = function (index) {
        var _ = this;
        console.debug('slide(%d)', index);

        var offset = 0;

        if (index < 0 || index >= _.count) {
            console.warn('指定偏移 > 幻灯片总数');
            return false;
        }

        if (!_.options.infinite && index === _.count) {
            offset = _.maxOffset;
        }

        var pvp = !_.currentDirection;
        offset = _._getLeft(index, pvp);

        _.slideTo(offset, function () {
            _.currentOffset = offset;
            _.currentSlide = index;

            _._postSlide();
        });
    };

    /**
     * 滚动指定偏移量
     * @param targetOffset
     * @param callback
     */
    ZScroll.prototype.slideTo = function (targetOffset, callback) {
        var _ = this;
        console.debug('slideTo(%s)', targetOffset);

        _.$track.animate(_.genCssPostion(targetOffset), _.options.speed, function () {
            console.debug('animated');

        });

        //_.$track.css(_.genCssPostion(targetOffset));

        callback();
    };

    /**
     * 移动结束之后干点什么
     * @private
     */
    ZScroll.prototype._postSlide = function () {
        var _ = this;
        console.debug('_postSlide()');

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
        zScroll: function() {

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
