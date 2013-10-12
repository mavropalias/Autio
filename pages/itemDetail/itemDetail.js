(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/itemDetail/itemDetail.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            var item = options && options.item ? Data.resolveItemReference(options.item) : Data.items.getAt(0);
            var playBtn = element.querySelector(".play");
            var pauseBtn = element.querySelector(".pause");

            element.querySelector(".titlearea .pagetitle").textContent = item.group.title;
            element.querySelector("article .item-title").textContent = item.title;
            element.querySelector("article .item-subtitle").textContent = (item.author) ? item.author : "";
            element.querySelector("article .item-image").src = item.cover;
            element.querySelector("article .item-progress").innerHTML = item.progressStr;
            element.querySelector("article .item-duration").innerHTML = item.durationStr;
            element.querySelector("progress").setAttribute('max', item.duration);
            element.querySelector("progress").setAttribute('value', item.progress);
            element.querySelector(".content").focus();

            // bind model to audio player, if playing this book
            if (AB.model.currentBook && AB.model.currentBook.bookFolder === item.bookFolder) {
                element.querySelector(".item-progress").setAttribute('data-win-bind', 'innerHTML: currentBook.progressStr');
                element.querySelector(".play").setAttribute('data-win-bind', 'style.display: playBtnDisplay');
                element.querySelector(".pause").setAttribute('data-win-bind', 'style.display: pauseBtnDisplay');
            } else {
                element.querySelector(".pause").style.display = "none";
            }

            // process winjs controls
            WinJS.Binding.processAll(null, AB.model);

            // play/pause button click handler
            element.querySelector(".playToggle").addEventListener("click", function () {
                if (AB.model.currentBook && AB.model.currentBook.bookFolder === item.bookFolder) {
                    AB.playPauseToggle();
                } else {
                    AB.setBook(item);
                    AB.playBook();

                    element.querySelector(".item-progress").setAttribute('data-win-bind', 'innerHTML: currentBook.progressStr');
                    element.querySelector(".play").setAttribute('data-win-bind', 'style.display: playBtnDisplay');
                    element.querySelector(".pause").setAttribute('data-win-bind', 'style.display: pauseBtnDisplay');

                    WinJS.Binding.processAll(null, AB.model);
                }
            });
        }
    });

})();
