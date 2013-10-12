(function () {
    "use strict";

    var bookLibrary = (store.get('books') && store.get('books').length > 0) ? store.get('books') : [];

    WinJS.Namespace.define("AB", {
        model: WinJS.Binding.as({
            currentBook: null,
            isPlaying: false,
            playBtnDisplay: "block",
            pauseBtnDisplay: "none",
            workingIndicatorDisplay: "none"
        }),

        audioPlayer: null,
        audioPlayerTimer: null,
        mediaControl: Windows.Media.MediaControl,
        timestamp: 0,

        setBook: setBook,
        setPlayer: setPlayer,
        scanFolder: scanFolder,
        processBookFiles: processBookFiles,
        playBook: playBook,
        updateModelIsPlaying: updateModelIsPlaying,
        playPauseToggle: playPauseToggle,
        updateBookProgress: updateBookProgress,
        tryToPlayNextFile: tryToPlayNextFile,
        addBookToLibrary: addBookToLibrary,
        saveBookLibrary: saveBookLibrary,
        deleteSelectedItemsFromList: deleteSelectedItemsFromList,
    });

    function setPlayer(oPlayer) {
        var audioPlayer = AB.audioPlayer = oPlayer;
        var _this = AB;
        var MediaControl = Windows.Media.MediaControl;

        // Add event listeners for the buttons
        MediaControl.isPlaying = false;
        MediaControl.addEventListener("playpressed", playpressed, false);
        MediaControl.addEventListener("pausepressed", pausepressed, false);
        MediaControl.addEventListener("playpausetogglepressed", _this.playPauseToggle, false);
        MediaControl.addEventListener("soundlevelchanged", soundlevelchanged, false);
        MediaControl.addEventListener("previoustrackselected", soundlevelchanged, false);
        MediaControl.addEventListener("nexttrackselected", nexttrackselected, false);
        MediaControl.addEventListener("stoppressed", stoppressed, false);
        MediaControl.addEventListener("fastforwardpressed", fastforwardpressed, false);
        MediaControl.addEventListener("rewindpressed", rewindpressed, false);
        MediaControl.addEventListener("channeluppressed", channeluppressed, false);
        MediaControl.addEventListener("channeldownpressed", channeldownpressed, false);
        MediaControl.addEventListener("recordpressed", recordpressed, false);

        function nexttrackselected() { }
        function stoppressed() { }
        function fastforwardpressed() { }
        function rewindpressed() { }
        function channeluppressed() { }
        function channeldownpressed() { }
        function recordpressed() { }

        function playpressed() {
            audioPlayer.play();
            MediaControl.isPlaying = true;
            _this.updateModelIsPlaying(true);
        }

        function pausepressed() {
            audioPlayer.pause();
            MediaControl.isPlaying = false;
            _this.updateModelIsPlaying(false);
        }

        function soundlevelchanged() {
            // Catch SoundLevel notifications and determine SoundLevel state.  If it's muted, pause the player. 
            var soundLevel = Windows.Media.MediaControl.soundLevel;

            switch (soundLevel) {

                case Windows.Media.SoundLevel.muted:
                    audioPlayer.pause();
                    MediaControl.isPlaying = false;
                    _this.updateModelIsPlaying(false);
                    break;
                case Windows.Media.SoundLevel.low:
                    playpressed();
                    break;
                case Windows.Media.SoundLevel.full:
                    playpressed();
                    break;
            }
        }

        // audio player event listeners

        audioPlayer.onplaying = function () {
            MediaControl.isPlaying = true;
            _this.updateModelIsPlaying(true);
        };

        audioPlayer.onpaused = function () {
            MediaControl.isPlaying = false;
            _this.updateModelIsPlaying(false);
        };

        audioPlayer.onended = function () {
            MediaControl.isPlaying = false;
            _this.updateModelIsPlaying(false);
            _this.tryToPlayNextFile();
        };

        audioPlayer.onloadeddata = function () {
            setMetadata(_this.model.currentBook.author, _this.model.currentBook.title, _this.model.currentBook.coverFile);
            AB.audioPlayer.currentTime = AB.model.currentBook.progress - AB.model.currentBook.files[AB.model.currentBook.currentPlayingFileArrayIndex].durationOfPreviousFiles;
        };
    }

    function tryToPlayNextFile() {
        if (AB.model.currentBook.currentPlayingFileArrayIndex < AB.model.currentBook.files.length) {
            AB.model.currentBook.currentPlayingFileArrayIndex++;
            playBook();
        }
    }

    function setBook(book) {
        AB.model.currentBook = book;
    }

    function playBook() {
        if (AB.audioPlayer && AB.model.currentBook) {
            //AB.audioPlayer.src = AB.model.currentBook.files[AB.model.currentBook.currentPlayingFileArrayIndex].path;
            AB.audioPlayer.src = URL.createObjectURL(AB.model.currentBook.files[AB.model.currentBook.currentPlayingFileArrayIndex].file, { oneTimeOnly: true })
            AB.audioPlayer.load();
        }
    }

    function playPauseToggle() {
        if (AB.mediaControl.isPlaying === true) {
            AB.audioPlayer.pause();
            AB.mediaControl.isPlaying = false;
            AB.updateModelIsPlaying(false);
        } else {
            AB.audioPlayer.play();
            AB.mediaControl.isPlaying = true;
            AB.updateModelIsPlaying(true);
        }
    }

    function updateModelIsPlaying(isPlaying) {
        if (isPlaying) {
            AB.model.isPlaying = true;
            AB.model.playBtnDisplay = "none";
            AB.model.pauseBtnDisplay = "inline-block";
            AB.audioPlayerTimer = setInterval(function () { AB.updateBookProgress(); }, 1000);
        } else {
            AB.model.isPlaying = false;
            AB.model.playBtnDisplay = "inline-block";
            AB.model.pauseBtnDisplay = "none";
            clearInterval(AB.audioPlayerTimer);
        }
    }

    function updateBookProgress() {
        if (AB.model.currentBook) {
            AB.model.currentBook.progress = AB.model.currentBook.files[AB.model.currentBook.currentPlayingFileArrayIndex].durationOfPreviousFiles / 1000 + parseInt(AB.audioPlayer.currentTime);
            AB.model.currentBook.progressStr = secondsToStr(AB.model.currentBook.progress);
        }
    }

    function scanFolder(folder, cb) {
        // timestamp scanned books
        this.timestamp = new Date().getTime();

        // get subfolders (books)
        folder.getFoldersAsync().then(function (folders) {
            if (folders) {

                var workingIndicator = document.querySelector(".workingIndicator");
                if (workingIndicator) workingIndicator.style.display = "block";
                AB.model.workingIndicatorDisplay = "block";

                // get folder contents - (single book)
                async.eachLimit(folders, 1, function (folder, cb) {
                    var query = folder.createFileQuery(Windows.Storage.Search.CommonFileQuery.orderByName);
                    var access = new Windows.Storage.BulkAccess.FileInformationFactory(
                        query,
                        Windows.Storage.FileProperties.ThumbnailMode.singleItem,
                        256,
                        Windows.Storage.FileProperties.ThumbnailOptions.none,
                        false
                    );

                    access.getFilesAsync(Windows.Storage.Search.FolderDepth.deep).then(function (files) {
                        AB.processBookFiles({
                            bookFolder: folder.path,
                            title: folder.name,
                            author: null,
                            progress: 0,
                            duration: 0,
                            cover: null,
                            files: [],
                        }, files).then(
                            function (book) {
                                // create new book record
                                if (book) Data.addBook(book, cb);
                            }
                        );
                    });
                }, function (err) {
                    var workingIndicator = document.querySelector(".workingIndicator");
                    if (workingIndicator) workingIndicator.style.display = "none";
                    AB.model.workingIndicatorDisplay = "none";
                    cb();
                });
            } else {
                cb();
            }
        });
    };

    function processBookFiles(book, files) {
        return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
            var usingFolderNameAsBookTitle = true;
            var author = null;
            var bookTitle = null;
            var year = null;
            var isAudioBook = false;

            files.forEach(function (file) {
                // scan audio files
                if (file.contentType.indexOf('audio') !== -1 || file.musicProperties.duration > 0) {
                    var bookMusicProperties = file.musicProperties;
                    var bookDocumentProperties = file.documentProperties;

                    bookTitle = (bookMusicProperties.album) ? bookMusicProperties.album : null;
                    author = (bookMusicProperties.albumArtist) ? bookMusicProperties.albumArtist :
                                (bookMusicProperties.artist) ? bookMusicProperties.artist :
                                    (bookDocumentProperties.author[0]) ? bookDocumentProperties.author[0] : null;
                    year = bookMusicProperties.year;

                    book.files.push({
                        file: file,
                        title: (bookDocumentProperties.title) ? bookDocumentProperties.title : file.displayName,
                        path: URL.createObjectURL(file, { oneTimeOnly: true }),
                        author: author,
                        bookTitle: bookTitle,
                        duration: bookMusicProperties.duration,
                        durationOfPreviousFiles: book.duration,
                        trackNumber: bookMusicProperties.trackNumber,
                        year: year
                    });

                    // set book attributes
                    if (usingFolderNameAsBookTitle && bookTitle) {
                        book.title = bookTitle;
                        usingFolderNameAsBookTitle = false;
                    }
                    if (book.author == null && author) {
                        book.author = author;
                    }
                    if (book.year == null && year) {
                        book.year = year;
                    }
                    if (book.cover == null && file.thumbnail && file.thumbnail.type === Windows.Storage.FileProperties.ThumbnailType.image) {
                        book.cover = URL.createObjectURL(file.thumbnail, { oneTimeOnly: true });;
                        file.thumbnail.close();
                    }
                    book.duration += bookMusicProperties.duration;
                    isAudioBook = true;
                } else if (file.contentType.indexOf("image") != -1 && file.thumbnail && file.thumbnail.type === Windows.Storage.FileProperties.ThumbnailType.image) {
                    book.cover = URL.createObjectURL(file.thumbnail, { oneTimeOnly: true });;
                }
            });

            if (isAudioBook) {
                book.durationStr = secondsToStr(book.duration / 1000);
                book.duration = book.duration / 1000;

                if (book.cover == null) {
                    book.cover = "/images/defaultCover.png";
                    book.coverDefault = "/images/defaultCover.png";
                }
                completeDispatch(book);
            } else {
                completeDispatch(null);
            }
        });
    }

    function secondsToStr(iSeconds) {
        var sec_num = parseInt(iSeconds, 10); // don't forget the second parm
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        var time    = hours+':'+minutes+':'+seconds;
        return time;
    }

    function setMetadata(artistName, trackName, coverUrl) {
        var MediaControl = Windows.Media.MediaControl;

        MediaControl.artistName = (artistName) ? artistName.substring(0, 127) : "Unknown author";
        MediaControl.trackName = (trackName) ? trackName.substring(0, 127) : "Unknown book title";
        //MediaControl.albumArt = new Windows.Foundation.Uri(_this.model.currentBook.coverUrl);

        // get thumbnail
        /*return;
        var thumbnailMode = Windows.Storage.FileProperties.ThumbnailMode.musicView;
        var thumbnailOptions = Windows.Storage.FileProperties.ThumbnailOptions.ResizeThumbnail;
        coverUrl.getThumbnailAsync(thumbnailMode, 96, thumbnailOptions).done(function (thumbnail) {
            if (thumbnail) {
                var inputStream = thumbnail.getInputStreamAt(0);
                var reader = new Windows.Storage.Streams.DataReader(inputStream);
                var size = thumbnail.size;

                // Save the thumbnail to a local temporary location
                if (size > 0) {
                    reader.loadAsync(size).done(function () {
                        var buffer = new Array(size);
                        reader.readBytes(buffer);

                        // Close the file streams
                        thumbnail.close();
                        reader.close();


                        var tempFolder = Windows.Storage.ApplicationData.current.temporaryFolder;

                        // Use ping-pong buffers in case the Media Control UI is still reading the thumbnail during a track change
                        if (thumbnailName === null || thumbnailName === "thumbnail2.jpg") {
                            thumbnailName = "thumbnail.jpg";
                        } else {
                            thumbnailName = "thumbnail2.jpg";
                        }

                        tempFolder.createFileAsync(thumbnailName, Windows.Storage.CreationCollisionOption.replaceExisting).done(function (imageFile) {
                            Windows.Storage.FileIO.writeBytesAsync(imageFile, buffer).done(function () {
                                playlist[songIndex].file.properties.getMusicPropertiesAsync().done(function (musicProperties) {

                                    var uri = new Windows.Foundation.Uri("ms-appdata:///temp/" + fileName);
                                    MediaControl.albumArt = new Windows.Foundation.Uri(_this.model.currentBook.coverUrl);

                                    setAlbumArt(thumbnailName, musicProperties);
                                });
                            });
                        });
                    });
                } else {
                    WinJS.log("Thumbnail is empty", "sample", "error");
                    thumbnail.close();
                    reader.close();
                    inputStream.close();

                }
            } else {
                WinJS.log(getTimeStampedMessage("Song Art Work not available for " + storageFile.path), "sample", "error");
                MediaControl.albumArt = "";
            }
        });*/
    }

    function addBookToLibrary(book) {
        var bookExists = false;

        bookLibrary.forEach(function (existingBook) {
            if (existingBook.bookFolder === book.bookFolder) {
                bookExists = true;
            }
        });

        if (!bookExists) {
            bookLibrary.push(book);
            this.saveBookLibrary();
        }
    }



    function saveBookLibrary() {
        store.set('books', bookLibrary);
    }

    function deleteSelectedItemsFromList(selection, list) {
    var indicesList = selection.sort(function(a,b){return a-b}); 
    for (var j = indicesList .length - 1; j >= 0; j--) {
        // To remove the items, call splice on the list, passing in a count and no replacements
        list.splice(indicesList[j], 1);
    }
}

})();