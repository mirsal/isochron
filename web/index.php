<?php


require_once(dirname(__FILE__).'/../config/ProjectConfiguration.class.php');

$configuration = ProjectConfiguration::getApplicationConfiguration('isochron', 'prod', false);
sfContext::createInstance($configuration)->dispatch();
