<?php use_javascript('http://maps.google.com/maps?file=api&v=2&key='.sfConfig::get('app_gmaps_key')) ?>
<?php use_javascript('isochron') ?>

<div id="map" style="height: 100%;position: relative"><?php echo $json_data ?></div>
