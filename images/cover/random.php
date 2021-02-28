
$str = explode("\n", file_get_contents('imgs.txt'));

$rand_index = rand(0,count($str)-1);

$url = $str[$rand_index];

$url = str_re($url);

header("Location:".$url);

function str_re($str){
    $str = str_replace(' ', "", $str);
    $str = str_replace("\n", "", $str);
    $str = str_replace("\t", "", $str);
    $str = str_replace("\r", "", $str);
    return $str;
  }