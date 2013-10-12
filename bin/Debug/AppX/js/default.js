// For an introduction to the Grid template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=232446
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.

                // init books from local storage
                // store.set('books', null);
                var bookLibrary = store.get('books');

                if (bookLibrary && bookLibrary.length > 0) {
                    async.eachLimit(bookLibrary, 1, function (book, cb) {
                        Data.addBook(book, cb);
                    }, function (err) {
                        // sync book library with filesystem
                        if (Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.entries.length > 0) {
                            Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.getFolderAsync("PickedFolderToken").then(function (folder) {
                                AB.scanFolder(folder, function () {
                                    Data.cleanLibrary();
                                });
                            });
                        }
                    });
                }
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(function () {
                // set audio player object
                AB.setPlayer(document.getElementById('audioPlayer'));

                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.home);
                }
            }));
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;
    };

    app.start();
})();
