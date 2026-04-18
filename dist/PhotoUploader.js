(function ($) {
    var parameters = {};
    var canvas = {};
    var context = {};
    var inputCache = [];
    var cameraId = 0;
    var isStarted = false;
    var canvasOffset = null;
    var stream = null;
    var videoElement = null;

    var camera = {
        deviceIds: [],
        constraints: {
            'audio': {'echoCancellation': true},
            'video': {
                'deviceId': cameraId,
                'width': {'min': parameters.photoWidth},
                'height': {'min': parameters.photoHeight},                
            }
        }
    };

    var currentImage = {
        image: {},
        height: 0,
        width: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    };

    var mouseEvents = {
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        isDragging: false,
        prevDiff: 0
    };

    $.fn.PhotoUploader = function (userParameters) {
        parameters = $.extend({}, $.fn.PhotoUploader.defaultParameters, userParameters);

        camera.constraints.video.width.min = parameters.photoWidth;
        camera.constraints.video.height.min = parameters.photoHeight;

        canvas = $("<canvas>", {
            id: "canvas",
            style: "border: 1px solid black; touch-action: none"
        })
            .attr("width", parameters.photoWidth)
            .attr("height", parameters.photoHeight)
            .on('mousedown', handleMouseDown)
            .on('touchstart', handleMouseDown);

        $(document).off('.photoUploader')
            .on('mousemove.photoUploader', handleMouseMove)
            .on('touchmove.photoUploader', handleMouseMove)
            .on('touchend.photoUploader', handleMouseUp)
            .on('touchcancel.photoUploader', handleMouseUp)
            .on('mouseup.photoUploader', handleMouseUp);

        canvasOffset = canvas.offset();
        mouseEvents.offsetX = canvasOffset.left;
        mouseEvents.offsetY = canvasOffset.top;

        context = canvas.get(0).getContext("2d");

        this.append(createModal());
        
        $("#upload-image").on("hidden.bs.modal", function () {
            stopVideo();
        });

        this.show = function () {
            $("#upload-image").modal("show");
        };
        return this;
    };

    function createHeader() {
        var modalHeader = $("<div>", {
            class: "modal-header"
        });

        modalHeader.append(
            $("<div>", {
                class: "d-flex align-items-center"
            }).append(
                $("<span>", {
                    class: "mr-3 text-primary h4 mb-0",
                    html: '<i class="fas fa-camera-retro"></i>'
                })
            ).append(
                $("<div>").append(
                    $("<h4>", {
                        class: "modal-title mb-1",
                        id: "upload-Image-label",
                        text: parameters.UploadPhotoText
                    })
                ).append(
                    $("<div>", {
                        class: "small text-muted",
                        text: parameters.CaptureFromWebcamText + ' / ' + parameters.UploadExistingPhotoText
                    })
                )
            )
        ).append(
            $("<button>", {
                type: "button",
                class: "bootbox-close-button close",
                'html': "&times;",
                'data-dismiss': "modal",
                'aria-label': "Close"
            }).on('click', () => {
                stopVideo();
            })
        );

        return modalHeader;
    }

    function createFileSelect() {
        var fileSelect = $("<div>", {
            class: function () {
                if (canCapture()) {
                    return "col-md-6 mb-3";
                } else {
                    return "col-md-12 mb-3";
                }
            },
            id: "fileSelect"
        }).on('click', () => {
            stopVideo();
        }).append(
            $("<input>", {
                style: "display: none",
                type: "file",
                name: "file",
                id: "file",
                size: "50"
            }).on('change', (e) => {
                fileSelectChanged(e)
            })
        ).append(
            $("<label>", {
                for: "file",
                class: "card card-outline card-primary h-100 mb-0 text-center shadow-sm",
                style: "cursor:pointer"
            }).append(
                $("<div>", {
                    class: "card-body d-flex flex-column justify-content-center"
                }).append(
                    $("<span>", {
                        class: "badge badge-primary align-self-center mb-3",
                        text: '1'
                    })
                ).append(
                    $("<div>", {
                        class: "text-primary mb-3",
                        html: '<i class="far fa-image fa-2x"></i>'
                    })
                ).append(
                    $("<div>", {
                        class: "font-weight-bold mb-2",
                        text: parameters.UploadExistingPhotoText
                    })
                ).append(
                    $("<div>", {
                        class: "small text-muted mb-3",
                        text: parameters.MaxPhotoSizeText + ': ' + parameters.maxPhotoSize
                    })
                ).append(
                    $("<span>", {
                        class: "btn btn-outline-primary btn-sm align-self-center",
                        text: parameters.UploadExistingPhotoText
                    })
                )
            )
        );

        return fileSelect;
    }

    function createCameraSelect() {
        if (canCapture()) {
            var cameraSelect = $("<div>", {
                class: "col-md-6 mb-3",
                id: "cameraSelect"
            }).append(
                $("<label>", {
                    id: "captureFromWebcam",
                    class: "card card-outline card-info h-100 mb-0 text-center shadow-sm",
                    style: "cursor:pointer"
                }).on('click', () => {
                    if (!isStarted) {
                        $("#previewPane").hide();
                        $("#capturePane").show();
                        $("#retake").show();
                        startVideo(camera);
                    }
                    isStarted = true;
                }).append(
                    $("<div>", {
                        class: "card-body d-flex flex-column justify-content-center"
                    }).append(
                        $("<span>", {
                            class: "badge badge-info align-self-center mb-3",
                            text: '2'
                        })
                    ).append(
                        $("<div>", {
                            class: "text-info mb-3",
                            html: '<i class="fas fa-video fa-2x" aria-hidden="true"></i>'
                        })
                    ).append(
                        $("<div>", {
                            class: "font-weight-bold mb-2",
                            text: parameters.CaptureFromWebcamText
                        })
                    ).append(
                        $("<div>", {
                            class: "small text-muted mb-3",
                            text: parameters.SnapPhotoText
                        })
                    ).append(
                        $("<span>", {
                            class: "btn btn-outline-info btn-sm align-self-center",
                            text: parameters.CaptureFromWebcamText
                        })
                    )
                )
            );

            // Get the initial set of cameras connected
            getConnectedDevices('videoinput');

            return cameraSelect;
        } else {
            return null;
        }
    }

    function createCapturePane() {
        if (!canCapture()) {
            return null;
        }
        var captureCard = $("<div>", {
            class: "card card-outline card-info shadow-sm mb-0"
        }).append(
            $("<div>", {
                class: "card-header d-flex align-items-center justify-content-between"
            }).append(
                $("<h5>", {
                    class: "card-title mb-0",
                    html: '<i class="fas fa-video mr-2"></i>' + parameters.CaptureFromWebcamText
                })
            ).append(
                $("<span>", {
                    class: "badge badge-info",
                    text: '2'
                })
            )
        ).append(
            $("<div>", {
                class: "card-body text-center"
            }).append(
                $("<video>", {
                    id: "video",
                    width: parameters.photoWidth,
                    height: parameters.photoHeight,
                    class: "img-fluid rounded border mb-3",
                    style: "padding: 0;margin: auto;display: block;max-width: " + parameters.photoWidth + "px;max-height:" + parameters.photoHeight + "px;position: relative;top: 0;bottom: 0;left: 0;right: 0;",
                    controls: true
                })
            ).append(
                $("<div>", {
                    class: "small text-muted mb-3",
                    text: parameters.SnapPhotoText + ' - ' + parameters.CaptureFromWebcamText
                })
            ).append(
                createCameraChooser()
            ).append(
                $("<div>", {
                    class: "mt-3"
                }).append(
                    $("<button>", {
                        class: "btn btn-primary",
                        type: "button",
                        id: "snap",
                        html: '<i class="fas fa-camera mr-2"></i>' + parameters.SnapPhotoText
                    }).on('click', () => {
                        snapshotVideo();
                    })
                )
            ).append(
                $("<div>", {
                    class: "small text-muted mt-3",
                    text: parameters.ReTakePhotoText
                })
            )
        );

        return $("<div>", {
            class: "col-md-12",
            id: "capturePane",
            style: "display:none; margin: 0 auto 1rem auto; max-width: " + (parameters.photoWidth + 80) + "px;"
        }).append(captureCard);
    }

    function createPreviewPane() {
        var previewCard = $("<div>", {
            class: "card card-outline card-secondary shadow-sm mb-0"
        }).append(
            $("<div>", {
                class: "card-header d-flex align-items-center justify-content-between"
            }).append(
                $("<h5>", {
                    class: "card-title mb-0",
                    html: '<i class="fas fa-crop-alt mr-2"></i>' + parameters.UploadImageText
                })
            ).append(
                $("<span>", {
                    class: "badge badge-secondary",
                    text: '3'
                })
            )
        ).append(
            $("<div>", {
                class: "card-body"
            }).append(
                $("<div>", {
                    class: "small text-muted mb-3",
                    text: parameters.ReTakePhotoText + ' / ' + parameters.UploadImageText
                })
            ).append(
                canvas
            ).append(
                $("<div>", {
                    class: "small text-muted mt-3",
                    text: parameters.UploadImageText
                })
            ).append(
                $("<div>", {
                    class: "mt-3"
                }).append(createEditControls())
            ).append(
                $("<div>", {
                    class: "mt-3"
                }).append(
                    $("<button>", {
                        class: "btn btn-outline-warning",
                        type: "button",
                        id: "retake",
                        style: "display:none",
                        html: '<i class="fas fa-redo mr-2"></i>' + parameters.ReTakePhotoText
                    }).on('click', () => {
                        retakeSnapshot();
                    })
                )
            )
        );

        return $("<div>", {
            class: "col-md-12 text-center",
            id: "previewPane",
            style: "padding: 0; margin: 0 auto 1rem auto; display: none; max-width: " + (parameters.photoWidth + 80) + "px;",
        }).append(previewCard);
    }

    // Fetch an array of devices of a certain type
    async function getConnectedDevices(type) {
        $('#availableCameras').empty();

        await navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const listElement  = $('#availableCameras');
            listElement.empty();

            for (var i = 0; i < devices.length; i++) {
                if (devices[i].kind !== type) {
                    continue;
                }
                listElement.append($('<option>').val(devices[i].deviceId).text(devices[i].label))
            }
        });
    }

    // Listen for changes to media devices and update the list accordingly
    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
        navigator.mediaDevices.addEventListener('devicechange', () => {
            getConnectedDevices('videoinput');
        });
    }

    function createCameraChooser() {
        var cameraChooser = $("<select>", {
            class: 'form-control form-control-sm',
            id: 'availableCameras'
        }).on('change', () => {
            camera.constraints.video.deviceId =  $('#availableCameras').find(":checked").val();
            startVideo (camera);
        });

        return cameraChooser;
    }

    function createEditControls() {
        var editControls = $("<div>", {
            id: "editControls",
            class: "btn-group btn-group-sm"
        });

        editControls.append(
            $("<button>", {
                class: "btn btn-outline-secondary",
                type: "button",
                id: "shrink",
                title: '-',
                html: '<i class="fas fa-search-minus mr-1"></i>-'
            }).on('click', () => {
                shrinkImage();
            })
        ).append(
            $("<button>", {
                class: "btn btn-outline-secondary",
                type: "button",
                id: "grow",
                title: '+',
                html: '<i class="fas fa-search-plus mr-1"></i>+'
            }).on('click', () => {
                growImage();
            })
        );

        return editControls;
    }

    function createBody() {
        var modalBody = $("<div>", {
            class: "modal-body"
        });

        var alertInfo = $("<div>", {
            class: "alert alert-light border d-flex align-items-start"
        }).append(
            $("<div>", {
                class: "mr-3 text-primary",
                html: '<i class="fas fa-info-circle fa-lg"></i>'
            })
        ).append(
            $("<div>").append(
                $("<div>", {
                    class: "font-weight-bold",
                    text: parameters.UploadPhotoText
                })
            ).append(
                $("<div>", {
                    class: "small text-muted",
                    text: parameters.UploadExistingPhotoText + ' / ' + parameters.CaptureFromWebcamText
                })
            )
        );

        var sourceRow = $("<div>", {
            class: "row"
        }).append(
            createFileSelect()
        ).append(
            createCameraSelect()
        );

        var previewRow = $("<div>", {
            class: "row"
        }).append(
            $("<div>", {
                id: "imageArea",
                style: "width:100%"
            }).append(
                createCapturePane()
            ).append(
                createPreviewPane()
            )
        );

        var container = $("<div>", {
            class: "container-fluid"
        }).append(
            alertInfo
        ).append(
            $("<div>", {
                class: "small text-muted mb-3 text-center",
                text: '1. ' + parameters.UploadExistingPhotoText + '   2. ' + parameters.CaptureFromWebcamText + '   3. ' + parameters.UploadImageText
            })
        ).append(
            sourceRow
        ).append(
            previewRow
        );

        let body = modalBody.append(container);

        return body;
    }

    function createFooter() {
        var modalFooter = $("<div>", {
            class: "modal-footer"
        });

        modalFooter.append(
            $("<div>", {
                class: "mr-auto small text-muted",
                text: parameters.UploadImageText
            })
        ).append(
            $("<button>", {
                type: "button",
                class: "btn btn-outline-secondary",
                "data-dismiss": "modal",
                html: '<i class="fas fa-times mr-2"></i>' + parameters.CloseText
            }).on('click', (event) => {
                $("#capturePane").hide();
                $("#previewPane").hide();
                stopVideo();
            })
        ).append(
            $("<button>", {
                id: "uploadImage",
                type: "submit",
                class: "btn btn-primary",
                "data-dismiss": "modal",
                style: "display:none",
                html: '<i class="fas fa-upload mr-2"></i>' + parameters.UploadImageText
            }).on('click', (event) => {
                parameters.uploadImage(event);
            })
        );

        return modalFooter;
    }

    function createModal() {
        var modal = $("<div>", {
            class: "modal fade",
            id: "upload-image",
            tabindex: "-1",
            role: "dialog",
            "aria-labelledby": "upload-Image-label",
            "aria-hidden": "true"
        });

        var modalDialog = $("<div>", {
            id: "photoUploader-dialog",
            class: "modal-dialog modal-lg"
        });

        var uploadForm = $("<form>", {
            action: "#",
            method: "POST",
            enctype: "multipart/form-data",
            id: "UploadForm"
        });

        var modalContent = $("<div>", {
            class: "modal-content"
        });
        return modal.append(
            modalDialog.append(
                uploadForm.append(
                    modalContent.append(
                        createHeader()
                    ).append(
                        createBody()
                    ).append(
                        createFooter()
                    )
                )
            )
        );
    }

    function setUploadButtonVisible(isVisible) {
        $('#uploadImage').toggle(!!isVisible);
    }

    function startVideo(camera) {
        $("#photoOr").show();
        $("#photoCapture").show();
        setUploadButtonVisible(false);

        // Grab elements, create settings, etc.
        videoElement = document.getElementById('video');

        if (parameters.fakeVideo) {
            videoElement.src = 'http://vjs.zencdn.net/v/oceans.mp4';
            videoElement.play();
            return;
        }

        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            stream = null;
        }

        navigator.mediaDevices.getUserMedia(camera.constraints)
            .then(function (mediaStream) {
                stream = mediaStream;

                if (!videoElement) {
                    return;
                }

                // Older browsers may not have srcObject
                if ("srcObject" in videoElement) {
                    videoElement.srcObject = mediaStream;
                } else {
                    // Avoid using this in new browsers, as it is going away.
                    videoElement.src = window.URL.createObjectURL(mediaStream);
                }
                videoElement.onloadedmetadata = function () {
                    videoElement.play();
                };
                
            })
            .catch(function (err) {
                console.log(err.name + ": " + err.message);
            });
    }

    function stopVideo() {
        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            stream = null;
        }

        if (videoElement) {
            if ('srcObject' in videoElement) {
                videoElement.srcObject = null;
            } else {
                videoElement.src = '';
            }
        }
        
        $("#previewPane").hide();
        $("#capturePane").hide();
        $("#retake").hide();                
        setUploadButtonVisible(false);

        isStarted = false;
        mouseEvents.prevDistance = 0;
    }

    function retakeSnapshot() {
        if (videoElement) {
            videoElement.play();
        }
        $("#previewPane").hide();
        $("#capturePane").show();
        setUploadButtonVisible(false);
    }

    function snapshotVideo() {
        if (!videoElement) {
            return;
        }

        videoElement.pause();
        currentImage.image = videoElement;
        currentImage.width = videoElement.videoWidth;
        currentImage.height = videoElement.videoHeight;
        fitImage();
        calcEdges();
        updateCanvas();
        $("#capturePane").hide();
        $("#previewPane").show();
        setUploadButtonVisible(true);
    }

    function fileSelectChanged(fileSelect) {
        var file = fileSelect.target.files[0];
        fileSelect.target.files = null;
        if (!file.type.match('image.*')) {
            return;
        }

        $("#retake").hide();
        $("#capturePane").hide();
        stopVideo();
        $("#previewPane").show();
        setUploadButtonVisible(true);

        currentImage.image = new Image();
        currentImage.image.onload = function () {
            currentImage.height = currentImage.image.height;
            currentImage.width = currentImage.image.width;
            fitImage();
            calcEdges();
            updateCanvas();
            canvas.show();
        };
        currentImage.image.src = URL.createObjectURL(file);

    }

    function calcEdges() {
        currentImage.right = currentImage.left + currentImage.width;
        currentImage.bottom = currentImage.top + currentImage.height;
    }

    function fitImage() {
        var ar;

        if (currentImage.width > parameters.photoWidth) {
            //if the image is wider than the user asked for
            ar = currentImage.height / currentImage.width;
            currentImage.width = parameters.photoWidth;
            currentImage.height = currentImage.width * ar;
        } else if (currentImage.height > parameters.photoHeight) {
            //if the image is taller than the user asked for
            ar = currentImage.width / currentImage.height;
            currentImage.height = parameters.photoHeight;
            currentImage.width = currentImage.height * ar;
        }
    }

    function getInput(e) {
        if (e.type === 'touchstart' || e.type === 'touchmove') {
            var touches = [];
            if (!e.touches) {
                touches = e.originalEvent.touches;

            } else {
                touches = e.touches;
            }

            inputCache = [];
            for (var i = 0; i < touches.length; i++) {
                inputCache.push({
                    clientX: touches[i].clientX,
                    clientY: touches[i].clientY,
                    identifier: touches[i].identifier
                });
            }

            if (inputCache.length == 2) {
                // Calculate the distance between the two pointers
                var diffX = inputCache[0].clientX - inputCache[1].clientX;
                var diffY = inputCache[0].clientY - inputCache[1].clientY;

                // Pythagorean theorem
                mouseEvents.distance = Math.sqrt(diffX * diffX + diffY * diffY);

                if (e.type === 'touchstart' || !mouseEvents.prevDistance) {
                    mouseEvents.prevDistance = mouseEvents.distance;
                }
            }
        } else {
            if (e.type === 'mousedown') {
                inputCache.push({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    identifier: 0
                });
            } else if (mouseEvents.isDragging) {
                inputCache[0].clientX = e.clientX;
                inputCache[0].clientY = e.clientY;
                inputCache[0].identifier = 0;
            }
        }

    }

    function removeInput(e) {
        if (e.type === 'mouseup') {
            inputCache = [];
            return;
        }

        if (e.type === 'touchend' || e.type === 'touchcancel') {
            var remainingTouches = e.originalEvent && e.originalEvent.touches ? e.originalEvent.touches : [];
            inputCache = [];

            for (var touchIndex = 0; touchIndex < remainingTouches.length; touchIndex++) {
                inputCache.push({
                    clientX: remainingTouches[touchIndex].clientX,
                    clientY: remainingTouches[touchIndex].clientY,
                    identifier: remainingTouches[touchIndex].identifier
                });
            }

            if (inputCache.length < 2) {
                mouseEvents.prevDistance = 0;
            }

            return;
        }

        // Remove this event from the target's cache
        for (var i = 0; i < inputCache.length; i++) {
            if (inputCache[i].pointerId == e.pointerId) {
                inputCache.splice(i, 1);
                break;
            }
        }
    }

    function handleMouseUp(e) {
        removeInput(e);
        mouseEvents.isDragging = inputCache.length === 1;
    }

    function handleMouseDown(e) {
        getInput(e);
        mouseEvents.isDragging = inputCache.length === 1;

        if (mouseEvents.isDragging) {
            mouseEvents.startX = parseInt(inputCache[0].clientX - mouseEvents.offsetX);
            mouseEvents.startY = parseInt(inputCache[0].clientY - mouseEvents.offsetY);
        }
    }

    function handleMouseMove(e) {
        getInput(e);
        if (mouseEvents.isDragging) {
            var dX = parseInt(inputCache[0].clientX, 10) - mouseEvents.startX - mouseEvents.offsetX;
            var dY = parseInt(inputCache[0].clientY, 10) - mouseEvents.startY - mouseEvents.offsetY;
            currentImage.top += dY;
            currentImage.bottom += dY;
            currentImage.left += dX;
            currentImage.right += dX;
            mouseEvents.startX = parseInt(inputCache[0].clientX, 10);
            mouseEvents.startY = parseInt(inputCache[0].clientY, 10);
            updateCanvas();
            if (e.cancelable) {
                e.preventDefault();
            }

        } else if (inputCache.length == 2) {
            var scale = mouseEvents.distance / mouseEvents.prevDistance;
            if (scale > 0) {
                // The distance between the two pointers has decreased
                currentImage.width *= scale;
                currentImage.height *= scale;

                calcEdges();
                updateCanvas();
            }

            // Cache the distance for the next move event
            mouseEvents.prevDistance = mouseEvents.distance;
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }

    function shrinkImage() {
        currentImage.width *= .90;
        currentImage.height *= .90;
        calcEdges();
        updateCanvas();
    }

    function growImage() {
        currentImage.width *= 1.1;
        currentImage.height *= 1.1;
        calcEdges();
        updateCanvas();
    }

    function updateCanvas() {
        context.clearRect(0, 0, parameters.photoWidth, parameters.photoHeight);
        context.drawImage(currentImage.image, currentImage.left, currentImage.top,
            currentImage.width, currentImage.height);
        context.beginPath();
        context.moveTo(currentImage.left, currentImage.top);
        context.lineTo(currentImage.right, currentImage.top);
        context.lineTo(currentImage.right, currentImage.bottom);
        context.lineTo(currentImage.left, currentImage.bottom);
        context.closePath();
        context.stroke();

    }


    function canCapture() {
        return navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.location.protocol == "https:";
        //return navigator.mediaDevices && navigator.mediaDevices.enumerateDevices && navigator.mediaDevices.getUserMedia && window.location.protocol == "https:";
    }

    $.fn.PhotoUploader.defaultParameters = {
        url: "/photo",
        maxPhotoSize: "2MB",
        photoHeight: 240,
        photoWidth: 320,
        uploadImage: function (event) {
            event.preventDefault();
            var dataURL = canvas.get(0).toDataURL();
            $.ajax({
                method: "POST",
                url: parameters.url,
                data: {
                    imgBase64: dataURL
                }
            }).done(function (o) {
                $("#upload-image").modal("hide");
                if (parameters.done) {
                    parameters.done(o);
                }
            });
        }
    }
})(jQuery);
