// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/setup/setup.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // Handle click events from the Photo command
            document.getElementById("chooseFolder").addEventListener("click", function (e) {
                // Verify that we are currently not snapped, or that we can unsnap to open the picker
                var currentState = Windows.UI.ViewManagement.ApplicationView.value;
                if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
                    !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                    // Fail silently if we can't unsnap
                    return;
                }

                // Create the picker object and set options
                var folderPicker = new Windows.Storage.Pickers.FolderPicker;
                folderPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.musicLibrary;
                // Users expect to have a filtered view of their folders depending on the scenario.
                // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
                folderPicker.fileTypeFilter.replaceAll([".mp3", ".wav", ".mpa"]);
                
                folderPicker.pickSingleFolderAsync().then(function (folder) {
                    if (folder) {
                        // Application now has read/write access to all contents in the picked folder (including sub-folder contents)
                        // Cache folder so the contents can be accessed at a later time
                        Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.addOrReplace("PickedFolderToken", folder);
                        WinJS.log && WinJS.log("Picked folder: " + folder.name, "sample", "status");

                        // process folder
                        AB.scanFolder(folder);

                    } else {
                        // The picker was dismissed with no selected file
                        WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
                    }
                });
            });
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in viewState.
        }
    });
})();
