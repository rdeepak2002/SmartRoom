var currentApp = '#app'
var otherApp = a => a == '#app' ? '#app-tmp' : '#app'
var menuLoad = () => {}

function closeApp() {
  $('.nameTag').show()
    $(otherApp(currentApp)).fadeOut(250)
    $(currentApp).hide()
}

function setOnMenuLoad(f) {
    menuLoad = f
}

function switchTo(name, direction='left') {
    $('.nameTag').hide()
    $(currentApp).show()
    $(otherApp(currentApp)).hide()
    if(direction) {
        slide($(currentApp), direction)
        $(currentApp).html(name)
    }
    else {
        $(currentApp).html(name)
    }
    menuLoad()
    currentApp = otherApp(currentApp)
    $('.close-icon').click(closeApp)
}
// function fadeTo(name) {
//     $(currentApp).html(name).ready(() => {
//         $(currentApp).fadeIn(400)
//         $(otherApp(currentApp)).fadeOut(400)
//     })
//     currentApp = otherApp(currentApp)
// }


function slide(el, from) {
    const classes = 'animated fadeIn' + from.charAt(0).toUpperCase() + from.slice(1)
    el.addClass(classes)
        .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
        () => el.removeClass(classes))
}


export { switchTo, closeApp, slide, setOnMenuLoad }
