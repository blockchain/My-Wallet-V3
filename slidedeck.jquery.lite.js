/**
 * SlideDeck 1.3.2 Lite - 2011-11-17
 * Copyright (c) 2011 digital-telepathy (http://www.dtelepathy.com)
 * 
 * Support the developers by purchasing the Pro version at http://www.slidedeck.com/download
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 * 
 * More information on this project:
 * http://www.slidedeck.com/
 * 
 * Requires: jQuery v1.3+
 * 
 * Full Usage Documentation: http://www.slidedeck.com/usage-documentation 
 * Usage:
 *     $(el).slidedeck(opts);
 * 
 * @param {HTMLObject} el    The <DL> element to extend as a SlideDeck
 * @param {Object} opts      An object to pass custom override options to
 */

var SlideDeck;
var SlideDeckSkin = {};

(function($){
    window.SlideDeck = function(el,opts){
        var self = this,
            el = $(el);
        
        var VERSION = "1.3.2";
        
        this.options = {
            speed: 500,
            transition: 'swing',
            start: 1,
            activeCorner: true,
            index: true,
            scroll: true,
            keys: true,
            autoPlay: false,
            autoPlayInterval: 5000,
            hideSpines: false,
            cycle: false,
            slideTransition: 'slide'
        };
        
        this.classes = {
            slide: 'slide',
            spine: 'spine',
            label: 'label',
            index: 'index',
            active: 'active',
            indicator: 'indicator',
            activeCorner: 'activeCorner',
            disabled: 'disabled',
            vertical: 'slidesVertical',
            previous: 'previous',
            next: 'next'
        };
        
        this.current = 1;
        this.deck = el;
        this.former = -1;
        this.spines = el.children('dt');
        this.slides = el.children('dd');
        this.controlTo = 1;
        this.session = [];
        this.disabledSlides = [];
        this.pauseAutoPlay = false;
        this.isLoaded = false;
        
        var UA = navigator.userAgent.toLowerCase();
        this.browser = {
	        chrome: UA.match(/chrome/) ? true : false,
	        firefox: UA.match(/firefox/) ? true : false,
	        firefox2: UA.match(/firefox\/2/) ? true : false,
	        firefox30: UA.match(/firefox\/3\.0/) ? true : false,
	        msie: UA.match(/msie/) ? true : false,
	        msie6: (UA.match(/msie 6/) && !UA.match(/msie 7|8/)) ? true : false,
	        msie7: UA.match(/msie 7/) ? true : false,
	        msie8: UA.match(/msie 8/) ? true : false,
	        msie9: UA.match(/msie 9/) ? true : false,
	        chromeFrame: (UA.match(/msie/) && UA.match(/chrome/)) ? true : false,
	        opera: UA.match(/opera/) ? true : false,
	        safari: (UA.match(/safari/) && !UA.match(/chrome/)) ? true : false
        };
        for(var b in this.browser){
            if(this.browser[b] === true){
                this.browser._this = b;
            }
        }
        if(this.browser.chrome === true && !this.browser.chromeFrame) {
            this.browser.version = UA.match(/chrome\/([0-9\.]+)/)[1];
        }
        if(this.browser.firefox === true) {
            this.browser.version = UA.match(/firefox\/([0-9\.]+)/)[1];
        }
        if(this.browser.msie === true) {
            this.browser.version = UA.match(/msie ([0-9\.]+)/)[1];
        }
        if(this.browser.opera === true) {
            this.browser.version = UA.match(/version\/([0-9\.]+)/)[1];
        }
        if(this.browser.safari === true) {
            this.browser.version = UA.match(/version\/([0-9\.]+)/)[1];
        }
        
        var width;
        var height;

        var spine_inner_width,
            spine_outer_width,
            slide_width,
            spine_half_width;
        
        // Used by some slide transitions to lockout progress while the SlideDeck animates looping around
        this.looping = false;
        
        // Get the CSS3 browser prefix
        var prefix = "";
        switch(self.browser._this){
            case "firefox":
            case "firefox3":
                prefix = "-moz-";
            break;
            
            case "chrome":
            case "safari":
                prefix = "-webkit-";
            break;
            
            case "opera":
                prefix = "-o-";
            break;
        }
        
        var FixIEAA = function(spine){
            if(self.browser.msie && !self.browser.msie9){
                var bgColor = spine.css('background-color');
                var sBgColor = bgColor;
                if(sBgColor == "transparent"){
                    bgColor = "#ffffff";
                } else {
                    if(sBgColor.match('#')){
                        // Hex, convert to RGB
                        if(sBgColor.length < 7){
                            var t = "#" + sBgColor.substr(1,1) + sBgColor.substr(1,1) + sBgColor.substr(2,1) + sBgColor.substr(2,1) + sBgColor.substr(3,1) + sBgColor.substr(3,1);
                            bgColor = t;
                        }
                    }
                }
                bgColor = bgColor.replace("#","");
                var cParts = {
                    r: bgColor.substr(0,2),
                    g: bgColor.substr(2,2),
                    b: bgColor.substr(4,2)
                };
                var bgRGB = "#";
                var hexVal = "01234567890ABCDEF";
                for(var k in cParts){
                    cParts[k] = Math.max(0,(parseInt(cParts[k],16) - 1));
                    cParts[k] = hexVal.charAt((cParts[k] - cParts[k]%16)/16) + hexVal.charAt(cParts[k]%16);
                    
                    bgRGB += cParts[k];
                }
                
                spine.find('.' + self.classes.index).css({
                    'filter': 'progid:DXImageTransform.Microsoft.BasicImage(rotation=1) chroma(color=' + bgRGB + ')',
                    backgroundColor: bgRGB
                });
            }
        };
        
        
        /**
         * Visual Attribution "Bug"
         * 
         * This is a visual "bug" that is placed in the lower right of the SlideDeck to give
         * visual recognition to SlideDeck and for us to see where any implementations that might
         * be worth placing in our community examples page reside. To help keep this plugin free 
         * we ask (although we cannot force) you to keep this visual "bug" on the page since it 
         * helps support the author.
         * 
         * If you would like to remove the visual "bug", we recommend you comment out the 
         * updateBug(); function and remove any references to the updateBug(); command.
         */
        var BUG = {
            id: "SlideDeck_Bug"+(Math.round(Math.random()*100000000)),
            styles: "position:absolute !important;height:"+13+"px !important;width:"+130+"px !important;display:block !important;margin:0 !important;overflow:hidden !important;visibility:visible !important;opacity:1 !important;padding:0 !important;z-index:20000 !important",
            width: 130,
            height: 13
        };        
        var updateBug = function(){
         
        };
        
        
        var autoPlay = function(){
            gotoNext = function(){
                if(self.pauseAutoPlay === false){
                    if(self.options.cycle === false && self.current == self.slides.length){
                        self.pauseAutoPlay = true;
                    } else {
                        self.next();
                    }
                }
            };
            
            setInterval(gotoNext,self.options.autoPlayInterval);
        };
        
        
        /**
         * Modify the positioning and z-indexing for slides upon build
         * 
         * @param string transition The slideTransition being used to determine how to build the slides
         * @param integer i The index of the slide to be modified
         */
        var buildSlideTransition = function(transition, i){
            var slideCSS = {
                display: 'block'
            };
            slideCSS[prefix + 'transform-origin'] = "50% 50%";
            slideCSS[prefix + 'transform'] = "";
            
            if(i < self.current) {
                var offset = i * spine_outer_width;
                if(self.options.hideSpines === true){
                    if(i == self.current - 1){
                        offset = 0;
                    } else {
                        offset = 0 - (self.options.start - i - 1) * el.width();
                    }
                }
            } else {
                var offset = i * spine_outer_width + slide_width;
                if(self.options.hideSpines === true){
                    offset = (i + 1 - self.options.start) * el.width();
                }
            }

            switch(transition){
                case "slide":
                default:
                    slideCSS.left = offset;
                    slideCSS.zIndex = 1;
                    // Other things to modify the slideCSS specifically for default transitions
                break;
            }
            
            self.slides.eq(i).css(prefix + 'transition', "").css(slideCSS);
            
            return offset;
        };
        
        
        var buildDeck = function(){
            if($.inArray(el.css('position'),['position','absolute','fixed'])){
                el.css('position', 'relative');
            }
            el.css('overflow', 'hidden');
            for(var i=0; i<self.slides.length; i++){
                var slide = $(self.slides[i]);
                if(self.spines.length > i){
                    var spine = $(self.spines[i]);
                }
                var sPad = {
                    top: parseInt(slide.css('padding-top'),10),
                    right: parseInt(slide.css('padding-right'),10),
                    bottom: parseInt(slide.css('padding-bottom'),10),
                    left: parseInt(slide.css('padding-left'),10)
                };
                var sBorder = {
                    top: parseInt(slide.css('border-top-width'),10),
                    right: parseInt(slide.css('border-right-width'),10),
                    bottom: parseInt(slide.css('border-bottom-width'),10),
                    left: parseInt(slide.css('border-left-width'),10)
                };
                for(var k in sBorder){
                    sBorder[k] = isNaN(sBorder[k]) ? 0 : sBorder[k];
                }
                if(i < self.current) {
                    if(i == self.current - 1){
                        if(self.options.hideSpines !== true){
                            spine.addClass(self.classes.active);
                        }
                        slide.addClass(self.classes.active);
                    }
                }
                
                self.slide_width = (slide_width - sPad.left - sPad.right - sBorder.left - sBorder.right);
                
                var slideCSS = {
                    position: 'absolute',
                    zIndex: 1,
                    height: (height - sPad.top - sPad.bottom - sBorder.top - sBorder.bottom) + "px",
                    width: self.slide_width + "px",
                    margin: 0,
                    paddingLeft: sPad.left + spine_outer_width + "px"
                };
                
                var offset = buildSlideTransition(self.options.slideTransition, i);
                
                slide.css(slideCSS).addClass(self.classes.slide).addClass(self.classes.slide + "_" + (i + 1));
                
                if (self.options.hideSpines !== true) {
                    var spinePad = {
                        top: parseInt(spine.css('padding-top'),10),
                        right: parseInt(spine.css('padding-right'),10),
                        bottom: parseInt(spine.css('padding-bottom'),10),
                        left: parseInt(spine.css('padding-left'),10)
                    };
                    for(var k in spinePad) {
                        if(spinePad[k] < 10 && (k == "left" || k == "right")){
                            spinePad[k] = 10;
                        }
                    }
                    var spinePadString = spinePad.top + "px " + spinePad.right + "px " + spinePad.bottom + "px " + spinePad.left + "px";
                    var spineStyles = {
                        position: 'absolute',
                        zIndex: 3,
                        display: 'block',
                        left: offset,
                        width: (height - spinePad.left - spinePad.right) + "px",
                        height: spine_inner_width + "px",
                        padding: spinePadString,
                        rotation: '270deg',
                        '-webkit-transform': 'rotate(270deg)',
                        '-webkit-transform-origin': spine_half_width + 'px 0px',
                        '-moz-transform': 'rotate(270deg)',
                        '-moz-transform-origin': spine_half_width + 'px 0px',
                        '-o-transform': 'rotate(270deg)',
                        '-o-transform-origin': spine_half_width + 'px 0px',
                        textAlign: 'right'
                    };
                    
                    if( !self.browser.msie9 ){
                        spineStyles.top = (self.browser.msie) ? 0 : (height - spine_half_width) + "px";
                        spineStyles.marginLeft = ((self.browser.msie) ? 0 : (0 - spine_half_width)) + "px";
	                    spineStyles.filter = 'progid:DXImageTransform.Microsoft.BasicImage(rotation=3)';
                    }

                    spine.css( spineStyles ).addClass(self.classes.spine).addClass(self.classes.spine + "_" + (i + 1));
                    
                    if(self.browser.msie9){
                        spine[0].style.msTransform = 'rotate(270deg)';
                        spine[0].style.msTransformOrigin = Math.round(parseInt(el[0].style.height, 10) / 2) + 'px ' + Math.round(parseInt(el[0].style.height, 10) / 2) + 'px';
                    }
                    
                } else {
                    if(typeof(spine) != "undefined"){
                        spine.hide();
                    }
                }
                if(i == self.slides.length-1){
                    slide.addClass('last');
                    if(self.options.hideSpines !== true){
                        spine.addClass('last');
                    }
                }
                
                // Add slide active corners
                if(self.options.activeCorner === true && self.options.hideSpines === false){
                    var corner = document.createElement('DIV');
                        corner.className = self.classes.activeCorner + ' ' + (self.classes.spine + '_' + (i + 1));
                    
                    spine.after(corner);
                    spine.next('.' + self.classes.activeCorner).css({
                        position: 'absolute',
                        top: '25px',
                        left: offset + spine_outer_width + "px",
                        overflow: "hidden",
                        zIndex: "20000"
                    }).hide();
                    if(spine.hasClass(self.classes.active)){
                        spine.next('.' + self.classes.activeCorner).show();
                    }
                }
                
                if (self.options.hideSpines !== true) {
                    // Add spine indexes, will always be numerical if unlicensed
                    var index = document.createElement('DIV');
                        index.className = self.classes.index;
                        
                    if(self.options.index !== false){
                        var textNode;
                        if(typeof(self.options.index) != 'boolean'){
                            textNode = self.options.index[i%self.options.index.length];
                        } else {
                            textNode = "" + (i + 1);
                        }
                        index.appendChild(document.createTextNode(textNode));
                    }
                            
                    spine.append(index);
                    spine.find('.' + self.classes.index).css({
                        position: 'absolute',
                        zIndex: 2,
                        display: 'block',
                        width: spine_inner_width + "px",
                        height: spine_inner_width + "px",
                        textAlign: 'center',
                        bottom: ((self.browser.msie) ? 0 : (0 - spine_half_width)) + "px",
                        left: ((self.browser.msie) ? 5 : 20) + "px",
                        rotation: "90deg",
                        '-webkit-transform': 'rotate(90deg)',
                        '-webkit-transform-origin': spine_half_width + 'px 0px',
                        '-moz-transform': 'rotate(90deg)',
                        '-moz-transform-origin': spine_half_width + 'px 0px',
                        '-o-transform': 'rotate(90deg)',
                        '-o-transform-origin': spine_half_width + 'px 0px'
                    });
                    
                    if(self.browser.msie9){
                        spine.find('.' + self.classes.index)[0].style.msTransform = 'rotate(90deg)';
                    }

                    FixIEAA(spine);
                }
            }
            
            updateBug();
            
            if(self.options.hideSpines !== true){
                // Setup Click Interaction
                self.spines.bind('click', function(event){
                    event.preventDefault();
                    self.goTo(self.spines.index(this)+1);
                });
              }
            
            // Setup Keyboard Interaction
            if(self.options.keys !== false){
                $(document).bind('keydown', function(event){
                    if($(event.target).parents().index(self.deck) == -1){
                        if(event.keyCode == 39) {
                            self.pauseAutoPlay = true;
                            self.next();
                        } else if(event.keyCode == 37) {
                            self.pauseAutoPlay = true;
                            self.prev();
                        }
                    }
                });
            }
            
            // Setup Mouse Wheel Interaction
            if(typeof($.event.special.mousewheel) != "undefined"){
                el.bind("mousewheel", function(event, mousewheeldelta){
                    if(self.options.scroll !== false){
                        //Initial mousewheel assignment (legacy)
                        var delta = event.detail ? event.detail : event.wheelDelta;
                        // Try new mousewheel assignment:
                        if( typeof(delta) == 'undefined' ){
                            delta = 0 - mousewheeldelta;
                        }
                        if(self.browser.msie || self.browser.safari || self.browser.chrome){
                            delta = 0 - delta;
                        }

                        var internal = false;
                        if($(event.originalTarget).parents(self.deck).length){
                            if($.inArray(event.originalTarget.nodeName.toLowerCase(),['input','select','option','textarea']) != -1){
                                internal = true;
                            }
                        }

                        if (internal !== true) {
                            if (delta > 0) {
                                switch (self.options.scroll) {
                                    case "stop":
                                        event.preventDefault();
                                        break;
                                    case true:
                                    default:
                                        if (self.current < self.slides.length || self.options.cycle == true) {
                                            event.preventDefault();
                                        }
                                    break;
                                }
                                self.pauseAutoPlay = true;
                                self.next();
                            }
                            else {
                                switch (self.options.scroll) {
                                    case "stop":
                                        event.preventDefault();
                                        break;
                                    case true:
                                    default:
                                        if (self.current != 1 || self.options.cycle == true) {
                                            event.preventDefault();
                                        }
                                    break;
                                }
                                self.pauseAutoPlay = true;
                                self.prev();
                            }
                        }
                    }    
                });
            }
            
            $(self.spines[self.current - 2]).addClass(self.classes.previous);
            $(self.spines[self.current]).addClass(self.classes.next);

            if(self.options.autoPlay === true){
                autoPlay();
            }
            
            self.isLoaded = true;
        };
        
        
        var getValidSlide = function(ind){
            ind = Math.min(self.slides.length,Math.max(1,ind));
            return ind;
        };


        var completeCallback = function(params){
            var afterFunctions = [];
            if(typeof(self.options.complete) == "function"){
                afterFunctions.push(function(){ self.options.complete(self); });
            }
            switch(typeof(params)){
                case "function":    // Only function passed
                    afterFunctions.push(function(){ params(self); });
                break;
                case "object":        // One of a pair of functions passed
                    afterFunctions.push(function(){ params.complete(self); });
                break;
            }
            
            var callbackFunction = function(){
                self.looping = false;
                
                for(var z=0; z<afterFunctions.length; z++){
                    afterFunctions[z]();
                }
            };
            
            return callbackFunction;
        };
        
        
        var transitions = {
            /**
             * Classic SlideDeck transition: Slide
             * 
             * This transition will take a stack or line of slides and move them all to the left or
             * the right keeping their order.
             */
            slide: function(ind, params, forward){
                for (var i = 0; i < self.slides.length; i++) {
                    var pos = 0;
                    if(self.options.hideSpines !== true){
                        var spine = $(self.spines[i]);
                    }
                    var slide = $(self.slides[i]);
                    if (i < self.current) {
                        if (i == (self.current - 1)) {
                            slide.addClass(self.classes.active);
                            if(self.options.hideSpines !== true){
                                spine.addClass(self.classes.active);
                                spine.next('.' + self.classes.activeCorner).show();
                            }
                        }
                        pos = i * spine_outer_width;
                    }
                    else {
                        pos = i * spine_outer_width + slide_width;
                    }
                    
                    if(self.options.hideSpines === true){
                        pos = (i - self.current + 1) * el.width();
                    }

                    var animOpts = {
                        duration: self.options.speed,
                        easing: self.options.transition
                    };

                    // Detect a function to run after animating
                    if(i == (forward === true && self.current - 1) || i == (forward === false && self.current)){
                        if(i === 0) {
                            animOpts.complete = completeCallback(params);
                        }
                    }

                    slide.stop().animate({
                        left: pos + "px",
                        width: self.slide_width + "px"
                    }, animOpts);
                    
                    if(self.options.hideSpines !== true){
                        FixIEAA(spine);
                        if(spine.css('left') != pos+"px"){
                            spine.stop().animate({
                                left: pos + "px"
                            },{
                                duration: self.options.speed,
                                easing: self.options.transition
                            });

                            spine.next('.' + self.classes.activeCorner).stop().animate({
                                left: pos + spine_outer_width + "px"
                            },{
                                duration: self.options.speed,
                                easing: self.options.transition
                            });
                        }
                    }
                }
            }
        };
        
        
        var slide = function(ind, params){
            ind = getValidSlide(ind);
            
            if ((ind <= self.controlTo || self.options.controlProgress !== true) && self.looping === false) {
                // Determine if we are moving forward in the SlideDeck or backward, 
                // this is used to determine when the callback should be run
                var forward = true;
                if(ind < self.current){
                    forward = false;
                }
                
                var classReset = [self.classes.active, self.classes.next, self.classes.previous].join(' ');
                
                self.former = self.current;
                self.current = ind;
                
                // Detect a function to run before animating
                if (typeof(self.options.before) == "function") {
                    self.options.before(self);
                }
                if (typeof(params) != "undefined") {
                    if (typeof(params.before) == "function") {
                        params.before(self);
                    }
                }
                
                if(self.current != self.former){
                    self.spines.removeClass(classReset);
                    self.slides.removeClass(classReset);
                    el.find('.' + self.classes.activeCorner).hide();
                    
                    self.spines.eq(self.current - 2).addClass(self.classes.previous);
                    self.spines.eq(self.current).addClass(self.classes.next);
                    
                    var slideTransition = 'slide';
                    if(typeof(transitions[self.options.slideTransition]) != 'undefined'){
                        slideTransition = self.options.slideTransition;
                    }
                    
                    transitions[slideTransition](ind, params, forward);
                }
                
                updateBug();
            }
        };
        
        var setOption = function(opts, val){
            var newOpts = opts;
            
            if(typeof(opts) === "string"){
                newOpts = {};
                newOpts[opts] = val;
            }
            
            for(var key in newOpts){
                val = newOpts[key];
                
                switch(key){
                    case "speed":
                    case "start":
                        val = parseFloat(val);
                        if(isNaN(val)){
                            val = self.options[key];
                        }
                    break;                    
                    case "scroll":
                    case "keys":
                    case "activeCorner":
                    case "hideSpines":
                    case "autoPlay":
                    case "cycle":
                        if(typeof(val) !== "boolean"){
                            val = self.options[key];
                        }
                    break;                    
                    case "transition":
                        if(typeof(val) !== "string"){
                            val = self.options[key];
                        }
                    break;
                    case "complete":
                    case "before":
                        if(typeof(val) !== "function"){
                            val = self.options[key];
                        }
                    break;
                    case "index":
                        if(typeof(val) !== "boolean"){
                            if(!$.isArray(val)){
                                val = self.options[key];
                            }
                        }
                    break;                    
                }
                
                self.options[key] = val;
            }
        };
        
        
        var setupDimensions = function(){
            height = el.height();
            width = el.width();

            el.css('height', height + "px");
    
            spine_inner_width = 0;
            spine_outer_width = 0;
            
            if(self.options.hideSpines !== true && self.spines.length > 0){
                spine_inner_width = $(self.spines[0]).height();
                spine_outer_width = $(self.spines[0]).outerHeight();
            }
            
            slide_width = width - spine_outer_width*self.spines.length;
            if(self.options.hideSpines === true){
                slide_width = width;
            }
            
            spine_half_width = Math.ceil(spine_inner_width/2);
        };
        
        
        var initialize = function(opts){
            if(typeof(opts) != "undefined"){
                for(var key in opts){
                    self.options[key] = opts[key];
                }
            }
            // Override hideSpines option if no spines are present in the DOM
            if(self.spines.length < 1){
                self.options.hideSpines = true;
            }
            // Turn off activeCorner if hideSpines is on
            if(self.options.hideSpines === true){
                self.options.activeCorner = false;
            }
            
            // Force self.options.slideTransition to "slide" as it is the only option for Lite
            self.options.slideTransition = 'slide';
            
            self.current = Math.min(self.slides.length,Math.max(1,self.options.start));
            
            if(el.height() > 0){
                setupDimensions();
                buildDeck();
            } else {
                var startupTimer;
                startupTimer = setTimeout(function(){
                    setupDimensions();
                    if(el.height() > 0){
                        clearInterval(startupTimer);
                        setupDimensions();
                        buildDeck();
                    }
                }, 20);
            }
        };
        
        
        var loaded = function(func){
            var thisTimer;
            thisTimer = setInterval(function(){
                if(self.isLoaded === true){
                    clearInterval(thisTimer);
                    func(self);
                }
            }, 20);
        };
        
        
        this.loaded = function(func){
            loaded(func);
                        
            return self;
        };
        
        this.next = function(params){
            var nextSlide = Math.min(self.slides.length,(self.current + 1));
            if(self.options.cycle === true){
                if(self.current + 1 > self.slides.length){
                    nextSlide = 1;
                }
            }
            slide(nextSlide,params);
            return self;
        };
        
        this.prev = function(params){
            var prevSlide = Math.max(1,(self.current - 1));
            if(self.options.cycle === true){
                if(self.current - 1 < 1){
                    prevSlide = self.slides.length;
                }
            }
            slide(prevSlide,params);
            return self;
        };
        
        this.goTo = function(ind,params){
            self.pauseAutoPlay = true;
            slide(Math.min(self.slides.length,Math.max(1,ind)),params);
            return self;
        };
        
        this.setOption = function(opts,val){
            setOption(opts,val);
            return self;
        };
        
        // Fallback for vertical function calls to prevent trigger of JavaScript error when run even with Lite library
        this.vertical = function(){
            return false;
        };
        
        initialize(opts);
    };
    
    $.fn.slidedeck = function(opts){
        var returnArr = [];
        for(var i=0; i<this.length; i++){
            if(!this[i].slidedeck){
                this[i].slidedeck = new SlideDeck(this[i],opts);
            }
            returnArr.push(this[i].slidedeck);
        }
        return returnArr.length > 1 ? returnArr : returnArr[0];
    };
})(jQuery);