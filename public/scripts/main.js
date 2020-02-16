/* Review - stars */
function highlightStar(obj) {
	removeHighlight();		
	$('.star').each(function(index) {
		$(this).addClass('highlight');
		if(index == $(".star").index(obj)) {
			return false;	
		}
	});
} 

function removeHighlight() {
	$('.star').removeClass('selected');
	$('.star').removeClass('highlight');
}

function addRating(obj) {
	$('.star').each(function(index) {
		$(this).addClass('selected');
		$('#rating').val((index+1));
		if(index == $(".star").index(obj)) {
			return false;	
		}
	});
}

function resetRating() {
	if($("#rating").val()) {
		$('.star').each(function(index) {
			$(this).addClass('selected');
			if((index+1) == $("#rating").val()) {
				return false;	
			}
		});
	}
}

/* Login show password */
function changeInput() {
	$("input#inputPassword").attr("type",function(index, value){
		if(value == "password"){
			$("input#inputPassword").attr("type", "text");
		} else {
			$("input#inputPassword").attr("type", "password");
		}
    });
	$("i.fa-eye").toggleClass("fa-eye-slash");
}

/* Upload image */
function showName () {
	document.getElementById('image').onchange = function () {
		if(this.files.item(0) == null){
			document.getElementById("fileText").innerHTML = "Choose an image..."
		} else {
			var imageName = this.files.item(0).name;
			document.getElementById("fileText").innerHTML = imageName;}
	};
}