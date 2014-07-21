var collections = {};

function Collections(){};

Collections.prototype.defined = function(){
  var name = arguments[0];
  if(!_.isString(name)){
    throw new Meteor.Error(500,'Collection的键必须是String类型');
  }
  if(collections.hasOwnProperty(name)){
    throw new Meteor.Error(500,'ActionSet配置错误，存在重复的Action名');
  }
  var options = arguments[1] || {};
  collections[name] = new Meteor.Collection(name,options);
};

Collections.prototype.get = function(name){
  if(collections.hasOwnProperty(name)){
    return collections[name];
  }
};

Collections.prototype.has = function(name){
  return collections.hasOwnProperty(name);
};

Collection = new Collections();

Collection.defined('GridManager');
