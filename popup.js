'use strict';

console.log('Azure Portal Resource Highlight - ENV - popup');

var DEFAULT_CONFIG = {
	isHighlightRG : false
};

$(function(){
	// console.log('[Azure Portal extension] Here is popup.js');

	$('#save_button').click(function(){
		var isHighlightRG = $('#isHighlightRG').is(":checked");

		var config = {
			isHighlightRG : isHighlightRG
		};
		chrome.storage.sync.set(config, function(){});
	});

	chrome.storage.sync.get(
		DEFAULT_CONFIG,
		function(items) {
			$("#isHighlightRG").prop('checked', items.isHighlightRG);
		}
	);

	$('#isHighlightRG').change( function(){
		var flag = !$("#isHighlightRG").prop('checked');
	});

});
