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
                            '<div class="text-write editor-window">' +
                                '<ul data-action="controls" class="controls">' +
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

        $textWrite.on('keyup', updatePreview);

        $editor.find('.controls').on('click', 'li', function() {
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
                        'list-style': 'none',
                        'padding-left': '0',
                        'margin-bottom': '0',
                        'background-color': '#eee'
                    },
                    '.jswriter .controls:after': {
                        'content': '" "',
                        'display': 'block',
                        'clear': 'both'
                    },
                    '.jswriter .controls li': {
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
                    '.jswriter .controls li:hover': {
                        'background-color': '#eee'
                    },
                    '.jswriter .controls .bold': {
                        'font-weight': 'bold'
                    },
                    '.jswriter .controls .italic': {
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