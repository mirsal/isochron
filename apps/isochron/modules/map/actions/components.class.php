<?php

class mapComponents extends sfComponents
{
    public function executeShow()
    {
        $this->json_data = json_encode(array(
            'datapoints' => $this->importDatapoints(),
            'computations' => sfConfig::get('app_isochron_computations'),
            'config' => sfConfig::get('app_isochron_config')
        ));
    }

    public function importDatapoints()
    {
        $datapoints = array();
        $file = fopen(sfConfig::get('sf_data_dir').DIRECTORY_SEPARATOR.sfConfig::get('app_isochron_datafile'), 'r');
        while(FALSE != ($line = fgetcsv($file)))
        {
            $datapoints[] = array(
                'title' => preg_replace('/[^a-zA-Z0-9-]/', ' ', $line[1]),
                'address' => preg_replace('/[^a-zA-Z0-9-]/', ' ',
                    sprintf('%s %s, %s', $line[6], $line[8], sfConfig::get('app_isochron_country')))
            );
        }

        fclose($file);
        return $datapoints;
    }
}
