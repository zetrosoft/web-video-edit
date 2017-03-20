<?php

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

define("JBEdit_dir", "jbedit/");
define("JBEdownload_dir", "downloaded/");

$op = @$_GET['op'];

$selected_frame = $op;

find_frames_ffmpeg($selected_frame);

function find_frames_ffmpeg($selected_frame){
  $handle = fopen(JBEdit_dir.JBEdownload_dir . "step.txt", 'r');
  $fps = fgets($handle);
  fclose($handle);

  $selected_sec = round($selected_frame/$fps, 3);
  if($selected_sec < 0)
    $selected_sec = 0.001;
  $video_full_path = JBEdit_dir.JBEdownload_dir . "video.mp4";
  $frames_folder = JBEdit_dir . "frames/";
  
  if(!file_exists($frames_folder))
    mkdir($frames_folder);
  
  $frame_full_path = $frames_folder . $selected_frame . ".png";
  
  if(!file_exists($frame_full_path)){
    popen("ffmpeg -ss $selected_sec -i $video_full_path -vcodec png -vframes 1 -s sqcif -f rawvideo $frame_full_path", "r");
  }

  $im = imagecreatefrompng($frame_full_path);
  ob_start();
  header('Content-Type: image/png');
  imagepng($im);
  ob_end_flush();
}

?>
