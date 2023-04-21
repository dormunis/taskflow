var collapsibles = document.getElementsByClassName("collapsible");

for (let i = 0; i < collapsibles.length; i++) {
    collapsibles[i].addEventListener("click", function() {
        let isEnabled = document.querySelector(".collapsible .checkbox-wrapper > input").checked;
        let content = this.nextElementSibling;
        if (!content.style.maxHeight && isEnabled) {
            content.style.maxHeight = "300em";
        } else {
            content.style.maxHeight = null;
        }
    });
}
