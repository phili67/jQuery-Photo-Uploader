(function ($) {
    var parameters = {};
    var canvas = {};
    var context = {};
    var inputCache = [];
    var cameraId = 0;
    var isStarted = false;

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
        this.stream = null;

        canvas = $("<canvas>", {
            id: "canvas",
            style: "border: 1px solid black; touch-action: none"
        })
            .attr("width", parameters.photoWidth)
            .attr("height", parameters.photoHeight)
            .on('mousedown', handleMouseDown)
            .on('touchstart', handleMouseDown);

        $(document).on('mousemove', handleMouseMove)
            .on('touchmove', handleMouseMove)
            .on('touchend', handleMouseUp)
            .on('mouseup', handleMouseUp);

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

        modalHeader.append($("<h4>", {
            class: "modal-title",
            id: "upload-Image-label",
            text: parameters.UploadPhotoText
        })).append($("<button>", {
            type: "button",
            class: "bootbox-close-button close",
            'html': "&times;",
            'data-dismiss': "modal",
            'aria-label': "Close"
            }).on('click', () => {
            stopVideo();
        }));

        return modalHeader;
    }

    function createFileSelect() {
        var fileSelect = $("<div>", {
            class: function () {
                if (canCapture()) {
                    return "col-md-6";
                } else {
                    return "col-md-12"
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
                html: '<i class="far fa-image IconCaptureFromWebcam"></i><br/> '+ parameters.UploadExistingPhotoText
            })
        ).append(
            $("<p>", {
                text: parameters.MaxPhotoSizeText + ": " + parameters.maxPhotoSize
            })
        );
        return fileSelect;
    }

    function createCameraSelect() {
        if (canCapture()) {
            var cameraSelect = $("<div>", {
                class: "col-md-6",
                id: "cameraSelect"
            }).append(
                $("<label>", {
                    id: "captureFromWebcam",
                    html: '<i class="fas fa-video IconCaptureFromWebcam" aria-hidden="true"></i><br>' + parameters.CaptureFromWebcamText,
                }).on('click', () => {
                    if (!isStarted) {
                        $("#previewPane").hide();
                        $("#capturePane").show();
                        $("#retake").show();
                        startVideo(camera);
                        $("#snap").on ('click', () => {
                            snapshotVideo();
                        })
                    }
                    isStarted = true;
                })
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
        var capture = $("<div>", {
            class: "",
            id: "capturePane",
            style: "display:none; text-align: center"
        }).append($("<div>", {
            class: "cold-md-12 text-center",
            style:'margin-top:10px'
        }).append(
            $("<video>", {
                id: "video",
                width: parameters.photoWidth,
                height: parameters.photoHeight,
                style: "margin-left: auto;margin-right: auto;display: block;max-width: " + parameters.photoWidth+"px;max-height:" + parameters.photoHeight+"px",
                style: "padding: 0;margin: auto;display: block;max-width: " + parameters.photoWidth+"px;max-height:" + parameters.photoHeight+"px;position: relative;top: 0;bottom: 0;left: 0;right: 0;",
                controls: true
            })
        ).append(
            $("<br>")
        ).append(
            createCameraChooser()
        ).append(
            $("<br>")
        ).append(
            $("<button>", {
                class: "btn btn-primary",
                type: "button",
                id: "snap",
                text: parameters.SnapPhotoText
            })
        ));
        return capture;
    }

    function createPreviewPane() {
        var capture = $("<div>", {
            class: "col-md-12 text-center",
            id: "previewPane",
            //style: "display: none; text-align: center;width:" + parameters.photoWidth + "px"
            style: "padding: 0;margin: auto;display: none;max-width: " + parameters.photoWidth+"px;max-height:" + parameters.photoHeight+"px;position: relative;top: 0;bottom: 0;left: 0;right: 0;",
        }).append(
            canvas
        ).append(
            $("<br>")
        ).append(
            createEditControls()
        ).append(
            $("<br>")
        ).append(
            $("<button>", {
                class: "btn btn-warning",
                type: "button",
                id: "retake",
                style: "display:none",
                text: parameters.ReTakePhotoText
            }).on('click', () => {
                retakeSnapshot();
            })
        );
        return capture;
    }

    // Fetch an array of devices of a certain type
    async function getConnectedDevices(type) {
        $('#availableCameras').empty();

        await navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const listElement  = $('#availableCameras')
            listElement.html = '';

            for (var i = 0; i < devices.length; i++) {
                if (devices[i].kind !== type) {
                    continue;
                }
                listElement.append($('<option>').val(devices[i].deviceId).text(devices[i].label))
            }
        });
    }

    // Listen for changes to media devices and update the list accordingly
    navigator.mediaDevices.addEventListener('devicechange', event => {        
        getConnectedDevices('videoinput');
    });

    function createCameraChooser() {
        var cameraChooser = $("<select>", {
            class: 'form-control',
            id: 'availableCameras'
        }).on('change', () => {
            camera.constraints.video.deviceId =  $('#availableCameras').find(":checked").val();
            startVideo (camera);
        });

        return cameraChooser;
    }

    function createEditControls() {
        var editControls = $("<div>", {
            id: "editControls"
        });

        editControls.append(
            $("<button>", {
                class: "btn btn-default",
                type: "button",
                id: "shrink",
                text: "-",
                style: "font-size:20px"
            }).on('click', () => {
                shrinkImage();
            })
        ).append(
            $("<button>", {
                class: "btn btn-default",
                type: "button",
                id: "grow",
                text: "+",
                style: "font-size:20px"
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

        var container = $("<div>", {
            class: "container-fluid"
        }).append(
            $("<div>", {class: "row"}).append(
                createFileSelect()
            ).append(
                createCameraSelect()
            )
        ).append(
            $("<div>", {class: "row"}).append(
                $("<div>", {
                    id: "imageArea",
                    style:"width:100%"
                })
                    .append(createCapturePane())
                    .append(createPreviewPane())
            )
        );

        let body = modalBody.append(container);

        return body;
    }

    function createFooter() {
        var modalFooter = $("<div>", {
            class: "modal-footer"
        });

        modalFooter.append(
            $("<button>", {
                type: "button",
                class: "btn btn-default",
                "data-dismiss": "modal",
                text: parameters.CloseText
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
                text: parameters.UploadImageText
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

    function startVideo(camera) {
        $("#photoOr").show();
        $("#photoCapture").show();

        // Grab elements, create settings, etc.
        this.video = document.getElementById('video');

        if (parameters.fakeVideo) {
            this.video.src = 'http://vjs.zencdn.net/v/oceans.mp4';
            this.video.play();
            return;
        }

        if (this.stream != null) {
            // now get all tracks
            tracks = this.stream.getTracks();
            // now close each track by having forEach loop
            tracks.forEach(function(track) {
                // stopping every track
                track.stop();
            });

            stream = this.stream = null;
        }

        navigator.mediaDevices.getUserMedia(camera.constraints)
            .then(function (stream) {
                this.stream = stream;
                var video = document.querySelector('video');
                // Older browsers may not have srcObject
                if ("srcObject" in video) {
                    video.srcObject = stream;
                } else {
                    // Avoid using this in new browsers, as it is going away.
                    video.src = window.URL.createObjectURL(stream);
                }
                video.onloadedmetadata = function (e) {
                    video.play();
                };
                
            })
            .catch(function (err) {
                console.log(err.name + ": " + err.message);
            });
    }

    function stopVideo() {
        stream = this.stream;

        if (stream) {
            // now get the steam 
            
            // now get all tracks
            tracks = stream.getTracks();
            // now close each track by having forEach loop
            tracks.forEach(function(track) {
                // stopping every track
                track.stop();
            });

            stream = this.stream = null;
        }
        
        $("#previewPane").hide();
        $("#capturePane").hide();
        $("#retake").hide();                

        isStarted = false;
    }

    function retakeSnapshot() {
        this.video.play();
        $("#previewPane").hide();
        $("#capturePane").show();
    }

    function snapshotVideo() {
        this.video.pause();
        currentImage.image = this.video;
        currentImage.width = this.video.videoWidth;
        currentImage.height = this.video.videoHeight;
        fitImage();
        calcEdges();
        updateCanvas();
        $("#capturePane").hide();
        $("#previewPane").show();
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

                if (mouseEvents.isDragging) {
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
            dX = parseInt(inputCache[0].clientX) - mouseEvents.startX - mouseEvents.offsetX;
            dY = parseInt(inputCache[0].clientY) - mouseEvents.startY - mouseEvents.offsetY;
            currentImage.top += dY;
            currentImage.bottom += dY;
            currentImage.left += dX;
            currentImage.right += dX;
            mouseEvents.startX = parseInt(inputCache[0].clientX);
            mouseEvents.startY = parseInt(inputCache[0].clientY);
            updateCanvas();

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
