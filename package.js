Package.describe({
  summary:'HC封装的DE-Grid'
});

Package.on_use(function(api){
  api.use('underscore',['client','server']);
  api.use('ui','client');
  api.use('bootstrap-3','client');
  api.use('reactive-dict',['client','server']);

  api.use('Appliance','client');

  api.add_files(['font/fontawesome-webfont.eot','font/fontawesome-webfont.ttf','font/fontawesome-webfont.woff','font/FontAwesome.otf'],'client');

  api.add_files(['css/images/sort_asc.png','css/images/sort_both.png','css/images/sort_desc.png'],'client'); 
   
  api.add_files(['css/font-awesome.min.css','css/DE-Grid.css'],'client');

  api.add_files('js/DE-Grid-common.js',['client','server']);

  api.add_files(['js/DE-Grid-client.js'],'client');

  api.export('Collection',['client','server'])
});