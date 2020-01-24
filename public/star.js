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