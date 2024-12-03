# jQuery Photo Uploader
jQuery Plugin for uploading local photos and capturing from a webcam

![plugin preview](https://raw.githubusercontent.com/phili67/jQuery-Photo-Uploader/master/preview1.png)


## Run Conditions

PhotoUploader detects whether webcam capture is possible.

*  If webcam capture is possible, then the use may choose between file upload, or live capture
*  If webcam capture is not possible, then the user may only choose to upload a file.

##  Usage

### DOM

PhotoUploader requires an empty ```<div>``` element on which to bind.

### JavaScript

PhotoUploader must be initialized on the result of a jQuery Selector before use.

```
  window.YourApp.photoUploader = $("#photoUploader").PhotoUploader({
    url: window.YourApp.root + "/APIEndPointForPOST",
    maxPhotoSize: "2MB",
    photoWidth:400,
    photoHeight: 400,
    UploadPhotoText: "Upload Photo",
    UploadExistingPhotoText: "Upload an existing Photo",
    MaxPhotoSizeText: "Max photo size",
    CaptureFromWebcamText: "Capture from Webcam",
    SnapPhotoText: "Snap Photo",
    ReTakePhotoText: "Re-Take Photo",
    CloseText: "Close",
    UploadImageText: "Upload Image"    
   });
```
To display a PhotoUploader, simply call the ```show()``` function of the already initialized PhotoUploader.

```
  $("#uploadImageButton").click(function(){
    window.YourApp.photoUploader.show();
  })
```

## Server Side

PhotoUploader will POST the captured / selected image as a Base64 Encoded png to the endpoint defined by the ```url``` option.


