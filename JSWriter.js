/**
* More Info: https://github.com/noeldemartin/jswriter
*/
(function($){
    $.fn.JSWriter = function (options) {
        // Initialize options
        var defaultOptions = {
                /**
                * String used to populate editor window.
                */
                text: '',
                /**
                * Styles to be used for the writer.
                *
                * This can either be a boolean False indicating not to use any styles or an
                * object where keys are css selectors, and values are JSON objects with css attribute-value pairs.
                */
                styles: buildDefaultStyles(),
                /**
                * Filters the text from input (editor) to output (preview).
                *
                * By default this method doesn't modify the text, it's intended to use for external formatting libraries (like markup).
                */
                filterText: defaultFilterText,
                /**
                * Provide a jQuery handle of a file type input.
                *
                * This input mustn't be activated by the user because it'll activated in javascript, so it is recommended that this
                * input is hidden.
                */
                createFileInput: defaultCreateFileInput
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
                                    '<li data-action="upload-image" class="upload-image">upload image</li>' +
                                    '<li data-action="url-image" class="url-image">url image</li>' +
                                '</ul>' +
                                '<textarea name="text_markdown" class="editor-text"></textarea>' +
                                '<ul class="assets"></ul>' +
                            '</div>' +
                            '<div class="separator"></div>' +
                            '<div class="text-preview editor-text editor-window"></div>' +
                        '</div>'),
            $textWrite = $editor.find('.text-write textarea'),
            $textPreview = $editor.find('.text-preview');

        $el.addClass('jswriter');
        $el.append($controls);
        $el.append($editor);
        updateEditorBounds();

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
                replaceSelectedText('\t');
            }
        });

        $textWrite.on('keyup', updatePreview);

        var assets = {};
        $editor.find('.tools').on('click', 'li', function() {
            var action = $(this).data('action');
            if (action == 'bold') {
                wrapSelectedText('<strong>', '</strong>');
            } else if (action == 'italic') {
                wrapSelectedText('<em>', '</em>');
            } else if (action == 'url-image') {
                var url = prompt('Please enter url', '');
                if (url) {
                    replaceSelectedText('<img src="' + url + '" />');
                }
            } else if (action == 'upload-image') {
                var $fileInput = options.createFileInput();
                $fileInput.change(function() {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var start = $textWrite.get(0).selectionStart,
                            end = $textWrite.get(0).selectionEnd,
                            text = $textWrite.val(),
                            imageId = $fileInput.val();

                        assets[imageId] = {'type': 'image',
                                            'id': imageId,
                                            'data': e.target.result,
                                            'input': $fileInput};

                        $textWrite.val(text.substring(0, start) +
                                        '{{image ' + imageId + '}}' +
                                        text.substring(end));

                        updatePreview();

                        addNewAsset(assets[imageId]);
                    }
                    reader.readAsDataURL($fileInput[0].files[0]);
                });
                $fileInput.trigger('click');
            }
        });

        // Init text
        if (options.text.length > 0) {
            $textWrite.text(options.text);
            $textPreview.html(options.filterText(resolveAssets(options.text)));
        }

        // Public methods
        this.getData = function() {
            var rawText = $textWrite.val();
            return {
                'input': rawText,
                'output': options.filterText(resolveAssets(rawText)),
                'assets': assets
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

            updatePreview();
            $textWrite.focus();
            $textWrite.get(0).selectionStart = $textWrite.get(0).selectionEnd = end + before.length + after.length;
        }

        function replaceSelectedText(newText) {
            var start = $textWrite.get(0).selectionStart,
                end = $textWrite.get(0).selectionEnd,
                text = $textWrite.val();

            $textWrite.val(text.substring(0, start) + newText + text.substring(end));
            $textWrite.focus();
            $textWrite.get(0).selectionStart = $textWrite.get(0).selectionEnd = start + newText.length;

            updatePreview();
        }

        function addNewAsset(asset) {
            $editor.find('.assets').append('<li><span class="type">' + asset.type + '</span>' + asset.id + '</li>');
            updateEditorBounds();
        }

        function resolveAssets(text) {
            var assetMatches = text.match(/{{.+?}}/g);
            if (assetMatches) {
                $.each(assetMatches, function(key, value) {
                    var assetType = value.substring(2, value.indexOf(' ')),
                        assetId = value.substring(value.indexOf(' ')+1, value.length-2);
                    if (assetType == 'image') {
                        text = text.replace(value, '<img src="' + assets[assetId].data + '" />');
                    }
                });
            }
            return text;
        }

        function updatePreview() {
            $textPreview.html(options.filterText(resolveAssets($textWrite.val())));
        }

        function updateEditorBounds() {
            var $tools = $editor.find('.tools'),
                $textarea = $editor.find('textarea'),
                $assets = $editor.find('.assets');
            $textarea.outerHeight($editor.height() - $tools.outerHeight() - $assets.outerHeight());
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

        function buildDefaultStyles() {
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
                        'padding': '0 5px',
                        'min-width': '20px',
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
                        'border': '0px',
                        'resize': 'none',
                        'background': '#d8d8d8'
                    },
                    '.jswriter .assets': {
                        'list-style': 'none',
                        'padding': 0,
                        'margin': 0
                    },
                    '.jswriter .assets li': {
                        'background-color': '#eee',
                        'border': '1px solid #bbb',
                        'padding': '5px'
                    },
                    '.jswriter .assets .type': {
                        'background-color': '#333',
                        'color': '#fff',
                        'padding': '3px',
                        'margin-right': '5px'
                    },
                    '.jswriter .editor.both .editor-window': {
                        'width': '49.5%'
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

        function defaultFilterText(text) {
            return text;
        }

        function defaultCreateFileInput() {
            return $('<input type="file" />');
        }

        return this;
    };
})(jQuery);