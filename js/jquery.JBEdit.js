/*
    JBEdit - An AJAX video editor
    Copyright (C) 2007  Matteo Giaccone <m.giacco@gmail.com>, Comvalid Inc.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

new function(){
  var Public = {
    'init': function(filename) { return init(filename); },
    'next': function() { return next(); },
    'prev': function() { return prev(); },
    'scroll_to': function(idx) { return scroll_to(idx); },
    'scroll_to_percent': function(perc) { return scroll_to_percent(perc); },
    'set_step': function(step) { set_step(step); },
    'set_mark': function(id) { set_mark(id); },
    'set_del': function(id) { select_cut(id); },
    'unset_del': function(id) { deselect_cut(id); },
    'del_mark': function(id) { unset_mark(id); },
    'reset': function() { reset(); },
    'scroll_to_percent': function() { scroll_to_percent(); },
    'scroll_set_step': function() { scroll_set_step(); },
    'extract': function() { extract(); },
    'zoom_in': function(id) { zoom_in(id); },
    'zoom_out': function(id) { zoom_out(id); },
    'show_extr': function(id) { show_extr(id); }
  };

  $.jfilm = Public;

	// Set of global private variables
  var Private = {
    'first': 0,
    'last': 0,
    'frames': 0,
    'frame_rate': 0,
    'step': 1,
    'window_width': 0,
    'filename': undefined,
    'start': -1,
    'stop': -1,
    'padding': 0,
    'scrolled': 0,
    'cut_point_arr': undefined,
    'cut_point_idx': 0,
    'sel_cut_point': undefined,
    'cordx_slider1': 0,
    'cordy_slider2': 0,
    'arr_step': undefined,
    'frame_path': undefined,
    'extract_id': 0
  };

	// Initializes all the variables and gets the video info from the server
  function init(filename){
  	$("#JB_overlay").hide();
    Private.filename = filename;
    Private.cut_point_arr = new Array();
    Private.sel_cut_point = new Array();
    Private.arr_step = new Array();

    if(Private.filename == undefined)
    	// Gets the filename from the HTML
      Private.filename = $("#JBE_filename").html();

    // Asks the server the total number of frames, the frame path and the frame rate of the video
    $.ajax({
      type: "GET",
      url: "php/JBEdit.php",
      data: "op=init&filename=" + Private.filename+"&start=&duration",
      async: false,
      success: function(data){
        //alert(data);
        data_array = data.split(":");
        Private.frame_path = data_array[0];
        Private.frames = parseInt(data_array[1]);
        Private.frame_rate = parseInt(data_array[2]);
      }
    });

    // determines the padding
    var extra = Private.frames % (Private.frame_rate * Private.step);
    var pad = (Private.frame_rate * Private.step) - extra;
    Private.padding = pad;

    // initializes the window
    Private.first = 1;
    Private.window_width = 5;
    Private.last = Math.round(Private.window_width * Private.step * Private.frame_rate);

		// generation of the array containing the step values
    var min_step = 1 / Private.frame_rate;
    var i = 4;
    var step_val = min_step;
    var tot_sec = Private.frames / Private.frame_rate;
    Private.arr_step[0] = Math.round(min_step*100)/100;
    Private.arr_step[1] = Math.round(Private.arr_step[0]*2*100)/100;
    Private.arr_step[2] = Math.round(Private.arr_step[1]*2*100)/100;
    Private.arr_step[3] = 1;

    while(Private.arr_step[i-1]<Math.round(tot_sec/(Private.window_width-1))/4 && i < 17){
    	Private.arr_step[i] = Private.arr_step[i-1] * 2;
			i++
    }

		Private.arr_step[i-1] = Math.round(tot_sec/(Private.window_width-1))/4;
    Private.arr_step[i] = Math.round(tot_sec/(Private.window_width-1))/2;
    //Private.arr_step[i+1] = Math.round(tot_sec/(Private.window_width-1));

    Private.step = Private.arr_step[i];

    // draws the window
    redraw_screen();

    // sets first and last as cut points, hidden to user.
    Private.cut_point_arr[0] = 1;
    Private.cut_point_arr[1] = Private.frames+1;

// BUG da controllare!! con redraw non funziona next - prev!!
		scroll_to_percent();
//    redraw(Private.first, Private.last);

  };

  // draws the window
  function redraw(first, last){
    var img, idx=0;
    var cut_point_flag;
    var link, prev_cut, selected_frame, prev_frame;
    prev_frame = Math.round(first - 1 * Private.step * Private.frame_rate);
    for (i = 0; i < Private.window_width; i++){
      cut_point_flag=0;
      selected_frame = Math.round(first + i * Private.step * Private.frame_rate);
      if(selected_frame < Private.frames){
				link = Private.frame_path + selected_frame + ".png";
      }
      else
        link = "images/end.png";
      prev_cut = max_min(selected_frame);

      //is cut point?
      /*if(inArray(Private.cut_point_arr, selected_frame) != -1){
        cut_point_flag = 1;
      }*/
      if(prev_cut > prev_frame)
      	cut_point_flag = 1;

      if(Private.sel_cut_point.length>0 && inArray(Private.sel_cut_point, prev_cut) != -1){
        evidence(link, i + 1, cut_point_flag);
      }
      else{
        display(link, i + 1, cut_point_flag);
      }
      prev_frame = selected_frame
    }

    // feedback for indicator position
    var slider_size = parseInt($('.slider1').css("width"));
    var indicator_size = parseInt($('.indicator1').css("width"));

    var mid = Math.round((first + last) / 2) + (Private.step * Private.frame_rate * 2);
    var perc = Math.round( mid / (Private.frames + Private.padding) * 100);

    var pad_left = (slider_size * perc / 100) - indicator_size;

    if((pad_left+indicator_size) > slider_size)
      pad_left = slider_size - indicator_size;
    if(pad_left < 0)
      pad_left = 0;


    $(".indicator1").css("left", pad_left);
    $("#pad_left").html(" step " + Private.step + " fr_rate " + Private.frame_rate + " padleft " + pad_left + " first " + first + " last "  + last + " pfrst " + Private.first + " plast " + Private.last);

    // For JQuery.Interface problems...
    $(".indicator1").css("display", "block");
    $("#dragHelper").css("display", "none");

    evidence_slider();
  };


  // draws the window one step forward --- provare ad utilizzare scroll_to
  function next(){
    if( Private.first + (Private.frame_rate * Private.step * (Private.window_width-1)) < (Private.frames + Private.padding) ){
      Private.first += (Private.frame_rate * Private.step);
      Private.last += (Private.frame_rate * Private.step);
      Private.scrolled = 0;
      redraw(Private.first, Private.last);
    }
  };

  // draws the window one step backward --- provare ad utilizzare scroll_to
  function prev(){
    if(Private.first > Private.frame_rate * Private.step){
      Private.first -= (Private.frame_rate * Private.step);
      Private.last -= (Private.frame_rate * Private.step);
      Private.scrolled = 0;
      redraw(Private.first, Private.last);
    }
  };

  // displays an image in the table
  function display(link, i, cut_point_flag){
    $("#cell" + i).parent().removeClass("evidenzia");

    if(cut_point_flag == 1){
      html_to_insert = "<div class=\"cut_frame\"></div><ul class=\"Menu\"><li onclick=\"$.jfilm.del_mark(" + i + ");\">UnMark</li>";
    }
    else{
      html_to_insert = "<ul class=\"Menu\"><li onclick=\"$.jfilm.set_mark(" + i + ");\">Mark</li>";
    }
		// Handler to the "mark to remove" function
		// <li onclick=\"$.jfilm.set_del(" + i + ");\">Remove</li>
    html_to_insert = html_to_insert + "<li onclick=\"$.jfilm.show_extr(" + i + ");\">Extract</li></ul><img width=128 height=96 src=\"" + link + "\" />";

    $("#cell" + i).html(html_to_insert);

    $("#cell" + i).hover(
      function(e) {
        $(this).find('ul').show();
      },
      function(e) {
        $(this).find('ul').hide();
      }
    );

  };

  function evidence(link, i, cut_point_flag){
    $("#cell" + i).parent().addClass("evidenzia");

    if(cut_point_flag == 1){
      html_to_insert = "<div class=\"cut_frame\"></div><ul class=\"Menu\"><li onclick=\"$.jfilm.del_mark(" + i + ");\">UnMark</li>";
    }
    else{
      html_to_insert = "<ul class=\"Menu\"><li onclick=\"$.jfilm.set_mark(" + i + ");\">Mark</li>";
    }
		// Handler to the "mark to remove" function
		// <li onclick=\"$.jfilm.unset_del(" + i + ");\">Keep</li>
    html_to_insert = html_to_insert + "<li onclick=\"$.jfilm.show_extr();\">Extract</li></ul><img width=128 height=96 src=\"" + link + "\" />";

    $("#cell" + i).html(html_to_insert);

    $("#cell" + i).hover(
      function(e) {
        $(this).find('ul').show();
      },
      function(e) {
        $(this).find('ul').hide();
      }
    );
  }

  function evidence_slider(){
    slider_size = parseInt($('.slider1').css("width"));

    // Cut points
    // Removes everything and then redraws the cut points
    $('#slider').children().remove(".cut_point");
    $('#slider').children().remove(".cut_selection");

    for(id=0; id<Private.cut_point_arr.length; id++){
	    $('#slider').append("<div id=\"cut" + id + "\" class=\"cut_point\" />");
	    position = (Private.cut_point_arr[id]-1) * slider_size / Private.frames;
	    $('#cut' + id).css("margin-left", position-2.5);
    }

    //evidence between cut points
    for(i=0; i<Private.sel_cut_point.length; i++){
      start = Private.sel_cut_point[i];
      start_id = inArray(Private.cut_point_arr, start);
      stop = Private.cut_point_arr[start_id + 1] - 1; // previous frame than next cut point
      left = start * slider_size / Private.frames;
      frame_width = stop - start;
      width = frame_width * slider_size / Private.frames;
      $('#slider').append("<div id=\"cut_sel" + i + "\" class=\"cut_selection\" />");
      $("#cut_sel" + i).css("margin-left", left);
      $("#cut_sel" + i).css("width", width);
    }
  }

  // scrolls to the selected index controlling the margins
  function scroll_to(idx){
    scrollback = 0;
    idx = parseInt(idx);
    if( idx < 1 )
      idx = 1;
    margin = idx + ((Private.window_width-1) * Private.step * Private.frame_rate);
    if( margin > (Private.frames + Private.padding) )
      scrollback = margin - (Private.frames + Private.padding);
    first = Math.round(idx - scrollback);
    last = Math.round(idx + (Private.window_width * Private.step * Private.frame_rate));
    redraw(first, last);
    Private.first = first;
    Private.last = last;
  };

  // scroll to the percentage requested
  function scroll_to_percent(){
    perc = parseInt(Private.cordx_slider1);
    idx_perc = Math.round(( (Private.frames + Private.padding) - (Private.step * Private.frame_rate * (Private.window_width-1))) * perc / 100);
    idx = idx_perc - idx_perc % (Private.step * Private.frame_rate) + 1;  // to scroll always exactly as the selected step
    scroll_to(idx);
  };

  // sets the step of the photograms
  function set_step(step){
    Private.step = step;
    redraw_screen();
    redraw(Private.first, Private.first + (Private.step * Private.frame_rate * (Private.window_width - 1)));
  };

  function scroll_set_step(){
    Private.scrolled = 0;
    step_perc = Private.cordy_slider2;
    // determines the padding
    extra = Private.frames % (Private.frame_rate * Private.step);
    pad = (Private.frame_rate * Private.step) - extra;
    Private.padding = pad;

    Private.step = Private.arr_step[Math.round((parseInt(step_perc))*(Private.arr_step.length-1) / parseInt($('.slider2').css("width")))];
		Private.last = Private.first + ((Private.window_width-1) * Private.step * Private.frame_rate);

    //$("#seconds").html(Private.arr_step.length);
    redraw_screen();
    redraw(Private.first, Private.last);
  };

  function zoom_in(id){
    cut = Private.first + ((id - 1) * Private.step * Private.frame_rate);

    step_idx = inArray(Private.arr_step, Private.step);

    if(step_idx > 0)
      step_idx--;
    else
    	return;
    	
    extra = Private.frames % (Private.frame_rate * Private.step);
    pad = (Private.frame_rate * Private.step) - extra;
    Private.padding = pad;

    Private.step = Private.arr_step[step_idx];

    Private.first = cut - ((id-1) * Private.step * Private.frame_rate);

    redraw_screen();
    redraw(Private.first, Private.last);
  }

  function zoom_out(id){
    cut = Private.first + ((id - 1) * Private.step * Private.frame_rate);

    step_idx = inArray(Private.arr_step, Private.step);

    if(step_idx < Private.arr_step.length - 1 )
      step_idx++;
    else
    	return;
    	
    extra = Private.frames % (Private.frame_rate * Private.step);
    pad = (Private.frame_rate * Private.step) - extra;
    Private.padding = pad;

    Private.step = Private.arr_step[step_idx];

    Private.first = cut - ((id-1) * Private.step * Private.frame_rate);

    redraw_screen();
    redraw(Private.first, Private.last);
  }

  function set_start(id){
    var temp, start;
    i = parseInt( id );
    start = Private.first + ((i - 1) * Private.step * Private.frame_rate);

    if ( (Private.start != -1) && (start > Private.stop)){
      temp = Private.stop;
      Private.stop = start;
      start = temp;
    }
    Private.start = start;
    if(Private.stop == -1)
      Private.stop = Private.frames;

    redraw(Private.first, Private.last);
  };

  function set_stop(id){
    var temp, stop;
    i = parseInt( id );
    stop = Private.first + ((i - 1) * Private.step * Private.frame_rate);
    if (Private.start > stop){
      temp = stop;
      stop = Private.start;
      Private.start = temp;
    }
    Private.stop = stop;

    redraw(Private.first, Private.last);
  };

  function redraw_screen(){
    var timer_slider1, timer_slider2;
    slider_width = parseInt($('.slider1').css("width"));
    new_width = slider_width * Private.window_width / ( (Private.frames + Private.padding) / (Private.step * Private.frame_rate) ) ;
    if(new_width > slider_width)
      new_width = slider_width;
    if(new_width < 5)
      new_width = 5;

    //slider and indicator creation
    $('#slider').children().remove();
    $('#slider').append("<div class=\"slider1\" />");
    $('#slider').children().append("<div class=\"indicator1\" />");
    $('#slider').append("<div class=\"slider_selected\" />");

    $(".indicator1").css({ width: new_width + "px" });

    $('.slider1').Slider({
      accept: '.indicator1',
      fractions : (Math.round( (Private.frames + Private.padding) / (Private.step * Private.frame_rate) ) - Private.window_width + 1),
      onSlide : function(cordx, cordy, x, y){
        clearTimeout(timer_slider1);
        Private.scrolled = 0;
        Private.cordx_slider1 = cordx;
        timer_slider1=setTimeout("$.jfilm.scroll_to_percent();", 200);
      }
    }
    );
    evidence_slider();
    // END slider and indicator

    // step slider
    // calculate number of fractions
    tot_sec = Private.frames / Private.frame_rate;
    min_step = 1 / Private.frame_rate;

    slider_width = parseInt($('.slider2').css("width"));
    new_width = slider_width/Private.arr_step.length;
    if(new_width > slider_width)
      new_width = slider_width;
    if(new_width < 5)
      new_width = 5;

    $(".indicator2").css({ width: new_width + "px" });

    $('.slider2').Slider({
      accept: '.indicator2',
      onSlide : function(cordx, cordy, x, y){
        clearTimeout(timer_slider2);
        Private.cordy_slider2 = x;
        timer_slider2=setTimeout("$.jfilm.scroll_set_step();", 200);
      }
    }
    );
    $("#seconds").html(Private.step);

    for(i=1; i<Private.window_width; i++){
      $("#zoom" + i).html("<div onclick=\"$.jfilm.zoom_in(" + i + ");\" style=\"cursor: pointer; top: 35px; height: 40px; width: 14px\" h>+</div>" + "<div onclick=\"$.jfilm.zoom_out(" + i + ");\" style=\"cursor: pointer; top: 35px; height: 40px; width: 14px\" h>-</div>");
    }

		// Step slider syncronization
		var slider_size = parseInt($('.slider2').css("width"));
		var arr_size = Private.arr_step.length;
		var step_pos = inArray(Private.arr_step, Private.step);
		var pad_left = step_pos * slider_size / arr_size;

		$(".indicator2").css("left", pad_left);
    // For JQuery.Interface problems...
    $(".indicator2").css("display", "block");
    $("#dragHelper").css("display", "none");
  };

  function extract(){
    var cut = Private.first + ((Private.extract_id - 1) * Private.step * Private.frame_rate);
    var prev_mark = max_min(cut);
    var next_mark = min_sup(cut);
    var time_in_sec = (next_mark - prev_mark) / Private.frame_rate;
    var time_start = Math.round((prev_mark / Private.frame_rate) *10000)/10000;

    $.ajax({
      type: "GET",
      url: "php/JBEdit.php",
      data: "op=extract&filename=" + Private.filename + "&start=" + time_start + "&duration="+time_in_sec,
      async: false,
      success: function(msg){
      link = msg;
      }
     });


   $("#JB_overlay").hide();
  }

  function show_extr(id_extr){
  	Private.extract_id = id_extr;
		$("#JB_overlay").show();
  }

  function set_mark(id){
    cut = Math.round(Private.first + ((id - 1) * Private.step * Private.frame_rate));
    prev_mark = max_min(cut);

    if(inArray(Private.cut_point_arr, cut) == -1){
      Private.cut_point_arr[Private.cut_point_arr.length] = cut;
    }
    Private.cut_point_arr.sort(sortNumber);
    if(inArray(Private.sel_cut_point, prev_mark) != -1){
      select_cut(id);
    }

    redraw(Private.first, Private.last);
  };

  function unset_mark(id){
  	var idx;
    var cut = Math.round(Private.first + ((id - 1) * Private.step * Private.frame_rate));
    var prev_cut = max_min(cut);
    var prev_frame = Private.first + ((id - 2) * Private.step * Private.frame_rate);

    if(prev_cut > prev_frame){
    	idx = inArray(Private.cut_point_arr, prev_cut)
      Private.cut_point_arr.splice(idx,1);


	    if((idx = inArray(Private.sel_cut_point, prev_cut)) != -1){
	      new_sel_point = max_min(cut);
	      Private.sel_cut_point.splice(idx,1,new_sel_point);
	    }
    }
    Private.cut_point_arr.sort(sortNumber);

    redraw(Private.first, Private.last);
  };

  function inArray(arr, obj){
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == obj) return i;
    }
    return -1;
  };

  function select_cut(id){
    cut = Private.first + ((id - 1) * Private.step * Private.frame_rate);
    sel_point = max_min(cut);
    Private.sel_cut_point[Private.sel_cut_point.length] = sel_point;
    evidence_slider();
    redraw(Private.first, Private.last);
    Private.sel_cut_point.sort(sortNumber);
  };

  function deselect_cut(id){
    cut = Private.first + ((id - 1) * Private.step * Private.frame_rate);
    sel_point = max_min(cut);
    if((idx = inArray(Private.sel_cut_point, sel_point)) != -1){
      Private.sel_cut_point.splice(idx,1);
    }

    evidence_slider();
    redraw(Private.first, Private.last);
  };

  function max_min(id){
    arr = Private.cut_point_arr;
    var frame_max, k;
    frame_max = k = 0;
    while(k<arr.length && arr[k] <= id){ // sorted array
      if(arr[k] > frame_max){
        frame_max = arr[k];
      }
      k++;
    }
    return frame_max;
  };

  function min_sup(id){
    arr = Private.cut_point_arr;
    var frame_min, k;
    k = arr.length-1;
    frame_min = Private.frames;
    while(k>0 && arr[k] > id){ // sorted array
      if(arr[k] < frame_min)
        frame_min = arr[k];
      k--;
    }
    return frame_min;
  };

  function sortNumber(a,b){
    return a - b;
  };

  function reset(){
    Private.cut_point_arr.splice(0, Private.cut_point_arr.length);
    Private.sel_cut_point.splice(0, Private.sel_cut_point.length);
    Private.cut_point_arr[0] = 1;
    Private.cut_point_arr[1] = Private.frames+1;
    init(Private.filename);
  };

}();

