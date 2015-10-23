(function($){
    $.fn.JSWriter = function (options) {
        // Initialize options
        var defaultOptions = {
                text: '',
                styles: true,
                textfilter: function(text) {
                    return text;
                }
            },
            options = $.extend(defaultOptions, options);

        // Insert styles if necessary
        if (options.styles && $('#jswriter-styles').length == 0) {
            injectStyles(options.styles);
        }

        // Prepare html markup
        var $el = $(this),
            $controls = $('<div class="controls">' +
                            '<ul class="tabs">' +
                                '<li data-mode="both" class="active"><a>Both</a></li>' +
                                '<li data-mode="write"><a>Write</a></li>' +
                                '<li data-mode="preview"><a>Preview</a></li>' +
                            '</ul>' +
                            '<a class="fullscreen">Fullscreen</a>' +
                        '</div>'),
            $editor = $('<div class="editor both">' +
                            '<div class="text-write editor-window">' +
                                '<ul class="tools">' +
                                    '<li data-action="bold" class="bold">B</li>' +
                                    '<li data-action="italic" class="italic">I</li>' +
                                '</ul>' +
                                '<textarea name="text_markdown" class="text-write editor-text"></textarea>' +
                            '</div>' +
                            '<div class="separator"></div>' +
                            '<div class="text-preview editor-text editor-window"></div>' +
                        '</div>'),
            $textWrite = $editor.find('.text-write textarea'),
            $textPreview = $editor.find('.text-preview');

        $el.addClass('jswriter');
        $el.append($controls);
        $el.append($editor);

        // Prepare events
        var currentMode = 'both';
        $controls.on('click', 'li', function() {
            var $this = $(this),
                mode = $this.data('mode');
            if (mode != currentMode) {
                $editor.removeClass(currentMode);
                $editor.addClass(mode);
                $controls.find('.active').removeClass('active');
                $this.addClass('active');
                currentMode = mode;
            }
        });

        $controls.find('.fullscreen').click(fullscreen);

        $textWrite.on('keydown', function(e) {
                // Allow tab character
                if ((e.keyCode || e.which) == 9) {
                    e.preventDefault();
                    var start = $textWrite.get(0).selectionStart,
                        end = $textWrite.get(0).selectionEnd;

                    // set textarea value to: text before caret + tab + text after caret
                    $textWrite.val(
                            $textWrite.val().substring(0, start)
                                + "\t" + $textWrite.val().substring(end));

                    // put caret at right position again
                    $textWrite.get(0).selectionStart = $textWrite.get(0).selectionEnd = start + 1;
                }
            });

        $textWrite.on('keyup', updatePreview);

        $editor.find('.tools').on('click', 'li', function() {
            var action = $(this).data('action');
            if (action == 'bold') {
                wrapSelectedText('<strong>', '</strong>');
            } else if (action == 'italic') {
                wrapSelectedText('<em>', '</em>');
            }
            updatePreview();
        });

        // Init text
        if (options.text.length > 0) {
            $textWrite.text(options.text);
            $textPreview.html(options.textfilter(options.text));
        }

        // Public methods
        this.getTexts = function() {
            var rawText = $textWrite.val();
            return {
                'write': rawText,
                'preview': options.textfilter(rawText)
            };
        }

        // Private methods
        function wrapSelectedText(before, after) {
            var start = $textWrite.get(0).selectionStart,
                end = $textWrite.get(0).selectionEnd,
                text = $textWrite.val();

            $textWrite.val(text.substring(0, start) +
                            before + text.substring(start, end) + after +
                            text.substring(end));
        }

        function updatePreview() {
            $textPreview.html(options.textfilter($textWrite.val()));
        }

        function fullscreen() {
            var el = $el[0];
            var fullscreenMethod = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen;
            fullscreenMethod.call(el);
        }

        function injectStyles(styles) {
            var $style = $('<style id="jswriter-styles"></styles'),
                css = '',
                rule;

            if (typeof styles != 'object') {
                styles = buildStyles();
            }

            for (selector in styles) {
                css += selector + '{';
                rule = styles[selector];
                for (prop in rule) {
                    css += prop + ':' + rule[prop] + ';';
                }
                css += '}';
            }
            $style.text(css);
            $('head').append($style);
        }

        function buildStyles() {
            var controlsHeight = 40,
                styles = {
                    '.jswriter a': {
                        'cursor': 'pointer'
                    },
                    '.jswriter .editor': {
                        'border': '1px solid #aaa',
                        'height': '500px'
                    },
                    '.jswriter .editor-window': {
                        'height': '100%',
                        'width': '100%',
                        'float': 'left',
                        'overflow-y': 'hidden'
                    },
                    '.jswriter .editor-text': {
                        'padding': '15px'
                    },
                    '.jswriter .editor-text:hover': {
                        'overflow-y': 'auto'
                    },
                    '.jswriter .controls': {
                        'width': '100%',
                        'height': controlsHeight + 'px'
                    },
                    '.jswriter .tabs': {
                        'list-style': 'none',
                        'padding-left': '0',
                        'margin-bottom': '0'
                    },
                    '.jswriter .tabs li': {
                        'float': 'left',
                        'display': 'block'
                    },
                    '.jswriter .tabs a': {
                        'display': 'block',
                        'height': controlsHeight + 'px',
                        'line-height': controlsHeight + 'px',
                        'padding': '0 5px',
                        'border-radius': '4px 4px 0px 0px',
                        'margin': '0 3px',
                        'color': '#888',
                        'background-color': '#eee',
                        'font-size': '1.5rem',
                        'text-decoration': 'none'
                    },
                    '.jswriter .tabs a:hover': {
                        'color': '#444',
                        'background-color': '#aaa'
                    },
                    '.jswriter .tabs .active a': {
                        'font-weight': 'bold',
                        'color': '#111',
                        'background-color': '#aaa'
                    },
                    '.jswriter .fullscreen': {
                        'float': 'right',
                        'text-decoration': 'none',
                        'color': '#fff',
                        'background-color': '#5bc0de',
                        'border-radius': '4px',
                        'border': '1px solid #46b8da',
                        'padding': '0 5px',
                        'margin': '2px',
                        'height': (controlsHeight - 4) + 'px',
                        'line-height': (controlsHeight - 4) + 'px'
                    },
                    '.jswriter .fullscreen:hover': {
                        'background-color': '#46adcc'
                    },
                    '.jswriter .tools': {
                        'list-style': 'none',
                        'padding-left': '0',
                        'margin-bottom': '0',
                        'background-color': '#eee'
                    },
                    '.jswriter .tools:after': {
                        'content': '" "',
                        'display': 'block',
                        'clear': 'both'
                    },
                    '.jswriter .tools li': {
                        'cursor': 'pointer',
                        'float': 'left',
                        'background-color': '#fff',
                        'border': '1px solid #666',
                        'text-align': 'center',
                        'line-height': '20px',
                        'margin': '2px',
                        'width': '20px',
                        'height': '20px'
                    },
                    '.jswriter .tools li:hover': {
                        'background-color': '#eee'
                    },
                    '.jswriter .tools .bold': {
                        'font-weight': 'bold'
                    },
                    '.jswriter .tools .italic': {
                        'font-style': 'italic'
                    },
                    '.jswriter textarea': {
                        'width': '100%',
                        'height': '474px'
                    },
                    '.jswriter .editor.both .editor-window': {
                        'width': '49.5%'
                    },
                    '.jswriter .text-write': {
                        'border': '0px',
                        'background': '#d8d8d8',
                        'resize': 'none'
                    },
                    '.jswriter .text-preview': {
                        'background': '#fff'
                    },
                    '.jswriter .separator': {
                        'background': '#aaa',
                        'float': 'left',
                        'width': '1%',
                        'height': '100%'
                    },
                    '.jswriter .editor.preview .separator, .jswriter .editor.preview .text-write': {
                        'display': 'none'
                    },
                    '.jswriter .editor.write .separator, .jswriter .editor.write .text-preview': {
                        'display': 'none'
                    }
                };

            return styles;
        }

        return this;
    };
})(jQuery);