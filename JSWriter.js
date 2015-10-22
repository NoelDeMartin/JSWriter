(function($){
    $.fn.JSWriter = function (options) {
        // Initialize options
        var defaultOptions = {
                text: '',
                styles: true,
                usingBootstrap: true,
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
            $tabs = $('<ul class="tabs editor-tabs">' +
                            '<li data-mode="both" class="active"><a>Both</a></li>' +
                            '<li data-mode="write"><a>Write</a></li>' +
                            '<li data-mode="preview"><a>Preview</a></li>' +
                        '</ul>'),
            $editor = $('<div class="editor both">' +
                            '<textarea name="text_markdown" class="text-write editor-text"></textarea>' +
                            '<div class="separator"></div>' +
                            '<div class="text-preview editor-text"></div>' +
                        '</div>'),
            $textWrite = $editor.find('.text-write'),
            $textPreview = $editor.find('.text-preview');

        if (options.usingBootstrap) {
            $tabs.removeClass('editor-tabs');
            $tabs.addClass('nav');
            $tabs.addClass('nav-tabs');
        }

        $el.addClass('jswriter');
        $el.append($tabs);
        $el.append($editor);

        // Prepare events
        var currentMode = 'both';
        $tabs.on('click', 'li', function() {
            var $this = $(this),
                mode = $this.data('mode');
            if (mode != currentMode) {
                $editor.removeClass(currentMode);
                $editor.addClass(mode);
                $tabs.find('.active').removeClass('active');
                $this.addClass('active');
                currentMode = mode;
            }
        });

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

        $textWrite.on('keyup', function(e) {
            $textPreview.html(options.textfilter($textWrite.val()));
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
            var styles = {
                    '.jswriter .tabs li': {
                        'cursor': 'pointer'
                    },
                    '.jswriter .editor': {
                        'border': '1px solid #aaa',
                        'height': '500px'
                    },
                    '.jswriter .editor-text': {
                        'padding': '15px',
                        'height': '100%',
                        'width': '100%',
                        'float': 'left',
                        'overflow-y': 'hidden'
                    },
                    '.jswriter .editor-text:hover': {
                        'overflow-y': 'auto'
                    },
                    '.jswriter .editor.both .editor-text': {
                        'width': '49.5%'
                    },
                    '.jswriter .text-write': {
                        'border': '0px',
                        'background': '#d8d8d8',
                        'resize': 'none'
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

            if (!options.usingBootstrap) {
                styles['.jswriter .editor-tabs'] = {
                    'list-style': 'none',
                    'padding-left': '0',
                    'margin-bottom': '0'
                };
                styles['.jswriter .editor-tabs::after'] = {
                    'display': 'table',
                    'content': '" "',
                    'clear': 'both'
                };
                styles['.jswriter .editor-tabs li'] = {
                    'float': 'left',
                    'display': 'block'
                };
                styles['.jswriter .editor-tabs a'] = {
                    'display': 'block',
                    'padding': '8px',
                    'border': '1px solid #aaa',
                    'background-color': '#eee',
                    'font-size': '2rem',
                    'text-decoration': 'none'
                };
                styles['.jswriter .editor-tabs a:hover'] = {
                    'background-color': '#aaa'
                };
                styles['.jswriter .active a'] = {
                    'background-color': '#aaa'
                };
            }

            return styles;
        }

        return this;
    };
})(jQuery);