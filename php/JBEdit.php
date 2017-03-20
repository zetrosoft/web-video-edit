<?php

/*
    jbedit - An AJAX video editor
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

define("VIDEO_DIR", "video/");
define("jbedit_dir", "../");
define("JBEdownload_dir", "downloaded/");

$filename = $_GET['filename'];
$start_time = $_GET['start'];
$duration = $_GET['duration'];

$op =$_GET['op'];


function find_frames_ffmpeg($video_name, $selected_frame){
  $selected_sec = round($selected_frame/25, 3);
  if($selected_sec < 0)
    $selected_sec = 0.001;
  $video_full_path = VIDEO_DIR . $video_name;
  $frames_folder = $video_full_path . ".frames/";
  
  if(!file_exists($frames_folder))
    mkdir($frames_folder);
  
  $frame_full_path = $frames_folder . $selected_frame . ".png";
  
  if(!file_exists($frame_full_path)){
    system("ffmpeg -ss $selected_sec -i $video_full_path -vcodec png -vframes 1 -s sqcif -f rawvideo $frame_full_path &");
  }
$im = imagecreatefrompng($frame_full_path);
ob_start();
header('Content-Type: image/png');

imagepng($im);
ob_end_flush();
}

function init($filename){
  $command = "ffmpeg -i ../".JBEdownload_dir.  $filename ." -r 1 ../video/frames/%d.png  2>&1";
  $output = system_o($command);

  echo "/jbedit/video/frames/:";
//echo $command;
echo $output;
}

function system_o($cmd){
  $b1 = 0; $b2 = 0;
 $fps_num=0;$sec=0;
  exec("$cmd", $f);
  
  foreach($f as $output) {
    $b1 = $b2 = 0;
    $b1 = preg_match ("/.* fps.*/", $output);
    $b2 = preg_match ("/.*Durat.*/", $output);
    //echo $output."<br>";
    //echo $b2."<br>";
    if($b1==1){
      $slices = explode(" ", $output);
      $fps_num = $slices[3];
    }
    
    if($b2==1){
      $slices = explode(" ", $output);
      $times = explode(":", $slices[3]);
      $seconds = explode(",", $times[2]);
      $sec = $seconds[0] + 60 * $times[1] + 3600*$times[0];
    }
  }
 
  $handle = fopen(jbedit_dir.JBEdownload_dir."step.txt", 'w');
  fwrite($handle, $fps_num);
  fclose($handle);

  $sec = $sec*$fps_num;
  return $sec . ":" . $fps_num;
}

function extract_video($filename, $start_time, $duration){
  $new_filename = "../".JBEdownload_dir."EXTRACTED_" . $filename;
  $filename = "../".JBEdownload_dir. $filename;
  $command = "ffmpeg -i $filename -acodec aac -ab 96 -ac 1 -ar 48000 -async 1 -vcodec mpeg4 -b:v 480 -mbd 2 -cmp 2 -subcmp 2 -s 320x240 -deinterlace -ss  $start_time -t  $duration -y  $new_filename -v 0 &";

  pclose(popen($command, 'r'));

  // debugging output
  echo $command;
}


switch($op){
  case "init":
    init($filename);
  break;

  case "extract":
    extract_video($filename, $start_time, $duration);
  break;
}

?>
