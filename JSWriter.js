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
                * Build the url for an asset once uploaded (used in the text which will be stored persistently).
                *
                * By default, this url will be relative to root in the following format: /assets/{id}.{extension}
                */
                buildAssetUrl: defaultBuildAssetUrl
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
                            '<a class="fullscreen-toggle">Fullscreen</a>' +
                        '</div>'),
            $editor = $('<div class="editor both">' +
                            '<div class="text-write editor-window">' +
                                '<ul class="tools">' +
                                    '<li data-action="bold" class="bold">B</li>' +
                                    '<li data-action="italic" class="italic">I</li>' +
                                    '<li data-action="upload-image" class="upload-image">upload image</li>' +
                                    '<li data-action="url-image" class="url-image">url image</li>' +
                                '</ul>' +
                                '<textarea class="editor-text"></textarea>' +
                                '<ul class="assets"></ul>' +
                            '</div>' +
                            '<div class="separator"></div>' +
                            '<div class="text-preview editor-text editor-window"></div>' +
                        '</div>'),
            $textWrite = $editor.find('.text-write textarea'),
            $textPreview = $editor.find('.text-preview');

        $el.addClass('jswriter');
        $el.prepend($editor);
        $el.prepend($controls);
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

        $controls.find('.fullscreen-toggle').click(fullscreen);
        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', updateEditorBounds);

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
                var $fileInput = $('<input name="assets[]" type="file" />');
                $fileInput.change(function() {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var start = $textWrite.get(0).selectionStart,
                            end = $textWrite.get(0).selectionEnd,
                            text = $textWrite.val(),
                            imageId = $fileInput.val(),
                            extension = $fileInput[0].files[0].type;

                        extension = extension.substring(extension.indexOf('/')+1);
                        imageId = imageId.substring(0, imageId.lastIndexOf('.'));
                        imageId = imageId.replace(new RegExp('[^\\w\\d-_]', 'g'), '');

                        assets[imageId] = {'type': 'image',
                                            'id': imageId,
                                            'extension': extension,
                                            'data': e.target.result};

                        $textWrite.val(text.substring(0, start) +
                                        '{{image ' + imageId + '}}' +
                                        text.substring(end));

                        updatePreview();

                        addNewAsset(assets[imageId], $fileInput);
                    }
                    reader.readAsDataURL($fileInput[0].files[0]);
                });
                $fileInput.trigger('click');
            }
        });

        $el.on('submit', function() {
            var $inputTextOriginal = $('<input name="text_original" type="hidden" />'),
                $inputTextHtml = $('<input name="text_html" type="hidden" />');
            $el.append($inputTextOriginal);
            $el.append($inputTextHtml);

            $inputTextOriginal.val(resolveAssets($textWrite.val(), true));
            $inputTextHtml.val(options.filterText(resolveAssets($textWrite.val(), true)));
        });

        // Init text
        if (options.text.length > 0) {
            $textWrite.text(options.text);
            $textPreview.html(options.filterText(resolveAssets(options.text)));
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

        function addNewAsset(asset, $fileInput) {
            var $asset = $('<li>' +
                                '<span class="type"><span>' + asset.type + '</span></span>' +
                                '<span class="id"><input data-id="' + asset.id + '" name="asset_ids[]" type="text" value="' + asset.id + '"/></span>' +
                                '<span class="action"><a class="add">+</a></span>' +
                                '<span class="action"><a class="remove">×</a></span>' +
                            '</li>'),
                $input = $asset.find('input');
            $editor.find('.assets').append($asset);
            $asset.append($fileInput);
            $input.on('keyup', function() {
                var $this = $(this),
                    oldId = $this.data('id'),
                    newId = $this.val();
                if (oldId != newId) {
                    $this.data('id', newId);
                    updateAssetId(oldId, newId);
                }
            });
            $asset.find('a.add').on('click', function() {
                var asset = assets[$input.data('id')];
                replaceSelectedText('{{' + asset.type + ' ' + asset.id + '}}');
            });
            $asset.find('a.remove').on('click', function() {
                removeAsset($input.data('id'));
                $asset.remove();
                updateEditorBounds();
                updatePreview();
            });
            updateEditorBounds();
        }

        function resolveAssets(text, assetUrl) {
            assetUrl = typeof assetUrl !== 'undefined' ? assetUrl : false;
            var assetMatches = text.match(/{{.+?}}/g);
            if (assetMatches) {
                $.each(assetMatches, function(key, value) {
                    var assetType = value.substring(2, value.indexOf(' ')),
                        assetId = value.substring(value.indexOf(' ')+1, value.length-2);
                    if (assetType == 'image') {
                        if (assetUrl) {
                            text = text.replace(value, '<img src="' + options.buildAssetUrl(assets[assetId]) + '" />');
                        } else {
                            text = text.replace(value, '<img src="' + assets[assetId].data + '" />');
                        }
                    }
                });
            }
            return text;
        }

        function updateAssetId(oldId, newId) {
            var asset = assets[oldId],
                text = $textWrite.val(),
                oldAsset = '{{' + asset.type + ' ' + oldId + '}}',
                oldAssetRegexp = new RegExp(oldAsset, 'g'),
                newAsset = '{{' + asset.type + ' ' + newId + '}}';

            // update text
            text = text.replace(oldAssetRegexp, newAsset);
            $textWrite.val(text);

            // update asset
            asset.id = newId;
            assets[newId] = asset;
            delete assets[oldId];
        }

        function removeAsset(id) {
            var asset = assets[id],
                text = $textWrite.val(),
                oldAssetRegexp = new RegExp('{{' + asset.type + ' ' + id + '}}', 'g');

            text = text.replace(oldAssetRegexp, '');
            $textWrite.val(text);
            delete assets[id];
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
            $editor.addClass('fullscreen');
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
                    '.jswriter.fullscreen .editor': {
                        // TODO 'height': '100%'
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
                    '.jswriter .fullscreen-toggle': {
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
                    '.jswriter .fullscreen-toggle:hover': {
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
                        'padding': '0',
                        'margin': '0'
                    },
                    '.jswriter .assets li': {
                        'display': 'table',
                        'width': '100%',
                        'background-color': '#eee',
                        'border': '1px solid #bbb',
                        'padding': '5px'
                    },
                    '.jswriter .assets .type': {
                        'vertical-align': 'middle',
                        'display': 'table-cell',
                        'padding': '0 5px'
                    },
                    '.jswriter .assets .type span': {
                        'display': 'block',
                        'color': 'white',
                        'background-color': '#333',
                        'height': '30px',
                        'width': '80px',
                        'line-height': '30px',
                        'text-align': 'center'
                    },
                    '.jswriter .assets .id': {
                        'vertical-align': 'middle',
                        'display': 'table-cell',
                        'width': '100%',
                        'padding': '0 5px'
                    },
                    '.jswriter .assets .id input': {
                        'border': '0',
                        'padding-left': '5px',
                        'background-color': '#eee',
                        'width': '100%',
                        'height': '30px'
                    },
                    '.jswriter .assets .id input:hover, .jswriter .assets .id input:focus': {
                        'background-color': '#9dc8c5'
                    },
                    '.jswriter .assets .action': {
                        'display': 'table-cell',
                        'text-align': 'center',
                        'width': '34px',
                        'padding': '0 2px'
                    },
                    '.jswriter .assets .action a': {
                        'display': 'block',
                        'line-height': '30px',
                        'font-size': '20px',
                        'font-weight': 'bold',
                        'color': 'white',
                        'border-radius': '3px',
                        'width': '30px',
                        'height': '30px',
                        'text-decoration': 'none'
                    },
                    '.jswriter .assets .remove': {
                        'background-color': '#d9534f'
                    },
                    '.jswriter .assets .remove:hover': {
                        'background-color': '#d43f3a'
                    },
                    '.jswriter .assets .add': {
                        'background-color': '#5cb85C'
                    },
                    '.jswriter .assets .add:hover': {
                        'background-color': '#4cae4c'
                    },
                    '.jswriter .assets input[type="file"]': {
                        'display': 'none'
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

        function defaultBuildAssetUrl(asset) {
            return '/assets/' + asset.id + '.' + 'png';
        }

        return this;
    };
})(jQuery);