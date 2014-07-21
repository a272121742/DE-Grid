(function(root){
  var DEFAULT_HANDLER = function(){
    console.warn('请配置事件处理函数，否则你将看到这个默认的事件！');
  };
  var actions = {};
  function ActionSet(){
  };
  ActionSet.prototype.set = function(name,handler){
    if(!_.isString(name)){
      throw new Meteor.Error(500,'ActionSet的键必须是String类型');
    }
    if(_.isUndefined(handler)){
      handler = DEFAULT_HANDLER;
    }
    if(!_.isFunction(handler)){
      throw new Meteor.Error(500,'ActionSet的值必须是Function类型');
    }
    if(actions.hasOwnProperty(name)){
      throw new Meteor.Error(500,'ActionSet配置错误，存在重复的Action名');
    }else{
      actions[name] = handler;
    }
  };
  ActionSet.prototype.get = function(name){
    if(actions.hasOwnProperty(name)){
      return actions[name];
    }
  }
  root.ActionSet = new ActionSet();

  var formats = {};
  function FormationSet(){
  };
  FormationSet.prototype.set = function(name,handler){
    if(!_.isString(name)){
      throw new Meteor.Error(500,'FormationSet的键必须是String类型');
    }
    if(_.isUndefined(handler)){
      handler = DEFAULT_HANDLER;
    }
    if(!_.isFunction(handler)){
      throw new Meteor.Error(500,'FormationSet的值必须是Function类型');
    }
    if(formats.hasOwnProperty(name)){
      throw new Meteor.Error(500,'FormationSet配置错误，存在重复的Formation名');
    }else{
      formats[name] = handler;
    }
  };
  FormationSet.prototype.get = function(name){
    if(formats.hasOwnProperty(name)){
      return formats[name];
    }
  };
  root.FormationSet = new FormationSet();
})(this);



(function(){
  //扩展方法
  if(jQuery){
    jQuery.Event.prototype.stopAll = function(){
      this.preventDefault();
      this.stopPropagation();
      this.stopImmediatePropagation();
    }
  }
})();


(function(){
  //定义常量
  var HTML_A_HREF_DEFAULT = 'javascript:;';
  var SORTING_TYPES = ['sorting_desc','sorting','sorting_asc'];
  //基础组件
  var BaseComponent = UI.Component.extend({
    __helperHost : true,
    kind : 'BaseComponent'
  });
  //分页组件
  var PaginationComponent = BaseComponent.extend({
    kind : 'PaginationComponent',
    //初始化，将内部组件添加进去
    init : function(){
      var Pagination = this;
      Pagination.helpers({
        __GridView_Pagination__ : function(){
          var CurrentSession = Pagination.getSession();
          var CurrentCollection = Pagination.getScope().Collection;
          var selector = CurrentSession.get('Selection.selector');
          var dataTotal = CurrentCollection.find(selector).count();
          var pageLimit = CurrentSession.get('Pagination.pageLimit');
          var currentNumber = CurrentSession.get('Pagination.currentNumber');
          var pageSkip = (currentNumber - 1) * pageLimit;
          var pageCount = Math.ceil(dataTotal / pageLimit);
          var pageInfo = CurrentSession.get('Pagination.pageInfo').replace('{{pageLimit}}',pageLimit).replace('{{dataTotal}}',dataTotal).replace('{{pageCount}}',pageCount).replace('{{currentNumber}}',currentNumber);
          var showNumberLevel = CurrentSession.get('Pagination.showNumberLevel');
          var hasBefore = 2 * showNumberLevel < _.min([pageCount + 1, 2 * currentNumber]);
          var hasAfter = 2 * showNumberLevel <= _.min([pageCount, 2 * (pageCount - currentNumber)]);
          var showCount = _.min([2 * showNumberLevel - 1, pageCount]);
          var showNumbers = [];
          var baseNumber = 1;
          if(showCount === pageCount || currentNumber <= showNumberLevel){
            baseNumber = 1;
          }else{
            if(currentNumber > pageCount - showNumberLevel){
              baseNumber = pageCount - showCount + 1;
            }else{
              baseNumber = currentNumber - showNumberLevel + 1;
            }
          }
          for(var i = 0; i < showCount; i++){
            showNumbers.push(baseNumber + i);
          }
          CurrentSession.set('Pagination.pageSkip',pageSkip);
          CurrentSession.set('Pagination.dataTotal',dataTotal);
          CurrentSession.set('Pagination.pageCount',pageCount);
          CurrentSession.set('Pagination.hasBefore',hasBefore);
          CurrentSession.set('Pagination.hasAfter',hasAfter);
          CurrentSession.set('Pagination.showNumbers',showNumbers);

          var beforeType = currentNumber === 1 ? 'disabled' : 'enabled';
          var afterType = currentNumber === pageCount ? 'disabled' : 'enabled';

          var enableLimitSelection = CurrentSession.get('Pagination.enableLimitSelection');
          var dropdownComponent = null;
          if(enableLimitSelection){
            var pageLimitArray = CurrentSession.get('Pagination.pageLimitArray');
            var pageDropdownMenu = HTML.UL({class : 'dropdown-menu'},
              UI.Each(function(){
                return pageLimitArray;
              }, UI.block(function(){
                var block = this;
                var item = block.get();
                return HTML.LI(
                  HTML.A({href : HTML_A_HREF_DEFAULT},
                    item
                  )
                );
              }))
            );
            var dropdownComponent = BaseComponent.extend({
              render:function(){
                return HTML.LI(
                  HTML.SPAN({class : 'dropdown'},[
                    HTML.A({class : 'btn btn-primary btn-sm', "data-toggle" : 'dropdown'},[
                      '每页' + pageLimit + '行',
                      HTML.SPAN({class : 'caret'})
                    ]),
                    pageDropdownMenu
                  ])
                );
              }
            });
            dropdownComponent.events({
              'click ul.dropdown-menu li a':function(e){
                e.stopAll();
                var pageLimit = this.valueOf();
                Pagination.getSession().set('Pagination.currentNumber',1);
                Pagination.getSession().set('Pagination.pageLimit',pageLimit);
              }
            });
          }
          //返回Pagination组件的零件组
          return BaseComponent.extend({
            render:function() {
              return [
                //渲染pageFirst按钮
                UI.With(function(){
                  return 1;
                }, UI.block(function(){
                  return HTML.LI({class : beforeType},
                    HTML.A({href : HTML_A_HREF_DEFAULT},
                      CurrentSession.get('Pagination.pageFirst')
                    )
                  );
                })),
                //渲染pagePrev按钮
                UI.With(function(){
                  return currentNumber - 1;
                }, UI.block(function(){
                  return HTML.LI({class : beforeType},
                    HTML.A({href : HTML_A_HREF_DEFAULT},
                      CurrentSession.get('Pagination.pagePrev')
                    )
                  );
                })),
                //渲染pageNumbers按钮
                UI.Each(function(){
                  return showNumbers;
                }, UI.block(function(){
                  var block = this;
                  var number = block.get();
                  return HTML.LI({class : currentNumber === number ? 'active' : 'enabled'},
                    HTML.A({href : HTML_A_HREF_DEFAULT}, 
                      number
                    )
                  )
                })),
                //渲染pageNext按钮
                UI.With(function(){
                  return currentNumber + 1;
                }, UI.block(function(){
                  return HTML.LI({class : afterType},
                    HTML.A({href : HTML_A_HREF_DEFAULT},
                      CurrentSession.get('Pagination.pageNext')
                    )
                  );
                })),
                //渲染pageLast按钮
                UI.With(function(){
                  return pageCount;
                }, UI.block(function(){
                  return HTML.LI({class : afterType},
                    HTML.A({href : HTML_A_HREF_DEFAULT},
                      CurrentSession.get('Pagination.pageLast')
                    )
                  );
                })),
                //渲染pageInfo按钮
                HTML.LI(HTML.SPAN(pageInfo)),
                //渲染pageLimitSelection控件
                dropdownComponent
            ]}
          });
        }
      });
      Pagination.events({
        "click li.enabled a":function(e){
          e.stopAll();
          var currentNumber = this.valueOf();
          currentNumber = currentNumber > 0 ? currentNumber : 1;
          Pagination.getSession().set('Pagination.currentNumber',currentNumber);
        }
      });
    },
    /*
        <ul class="pagination">
          {{> __GridView_Pagination__}}
        </ul>
    */
    render : function(){
      var Pagination = this;
      return HTML.UL({class : 'pagination'},
        Spacebars.include(Pagination.lookupTemplate('__GridView_Pagination__'))
      );
    }
  });

  var GridComponent = BaseComponent.extend({
    kind : 'GridComponent',
    __GridView_Pagination__ : PaginationComponent,
    init : function(){
      if(!this.hasParent('__ContainerComponent__')){
        throw new Meteor.Error(10000,'错误的模板书写格式','Grid必须包裹在Container中！');
      }
      //get config 
      var config = this.get('config');
      //get Scope
      var CurrentScope = this.getScope();
      var CurrentSession = CurrentScope.Session;
      var CurrentCollection = CurrentScope.Collection = Collection.get(config.sourceName);
      _.defaults(config,{title : '列表', ActionSet : [], FieldSet : {}, Global : {}, Sortation : {}, Pagination : {}, Columniation : {}, Selection : {} });
      _.defaults(config.Global,{action : [], allowActionGroup : false });
      _.defaults(config.Sortation,{sortable : true, sortCombination : false, sorters2Object : {}, });
      _.defaults(config.Pagination,{pageFirst : '首页', pagePrev : '上一页', pageNext : '下一页', pageLast : '末页', pageInfo : '当前 {{currentNumber}} / {{pageCount}} 页 | 共 {{dataTotal}} 行', showNumberLevel : 2, enableLimitSelection : true, pageLimitArray : [5,10,20,50] });
      _.defaults(config.Columniation,{multiSelection : true, enableActionColumn : true, allowActionGroup : false, action : [] });
      _.defaults(config.Selection,{selector : {} });
      if(Match.test(config.FieldSet,{})){throw new Meteor.Error(500,'必须配置查询的字段集','请检查数据库中是否为FieldSet赋值了多个可用查询对象！'); }
      CurrentSession.setDefault('Sortation.sortable',config.Sortation.sortable);
      CurrentSession.setDefault('Sortation.sortCombination',config.Sortation.sortCombination);
      CurrentSession.setDefault('Sortation.sorters2Object',config.Sortation.sorters2Object);
      CurrentSession.setDefault('Pagination.pageLimit',config.Pagination.pageLimitArray[0]);
      CurrentSession.setDefault('Pagination.pageSkip',0);
      CurrentSession.setDefault('Pagination.currentNumber',1);
      CurrentSession.setDefault('Pagination.dataTotal',0);
      CurrentSession.setDefault('Pagination.pageCount',0);
      CurrentSession.setDefault('Pagination.pageFirst',config.Pagination.pageFirst);
      CurrentSession.setDefault('Pagination.pagePrev',config.Pagination.pagePrev);
      CurrentSession.setDefault('Pagination.hasBefore',false);
      CurrentSession.setDefault('Pagination.pageBefore','...');
      CurrentSession.setDefault('Pagination.showNumbers',[]);
      CurrentSession.setDefault('Pagination.showNumberLevel',config.Pagination.showNumberLevel);
      CurrentSession.setDefault('Pagination.hasAfter',false);
      CurrentSession.setDefault('Pagination.pageAfter','...');
      CurrentSession.setDefault('Pagination.pageNext',config.Pagination.pageNext);
      CurrentSession.setDefault('Pagination.pageLast',config.Pagination.pageLast);
      CurrentSession.setDefault('Pagination.pageInfo',config.Pagination.pageInfo);
      CurrentSession.setDefault('Pagination.enableLimitSelection',config.Pagination.enableLimitSelection);
      CurrentSession.setDefault('Pagination.pageLimitArray',config.Pagination.pageLimitArray);
      CurrentSession.setDefault('Columniation.autoId',!!config.Columniation.autoId);
      CurrentSession.setDefault('Columniation.multiSelection',config.Columniation.multiSelection);
      CurrentSession.setDefault('Columniation.enableActionColumn',config.Columniation.enableActionColumn);
      CurrentSession.setDefault('Columniation.action',config.Columniation.action);
      CurrentSession.setDefault('Columniation.allowActionGroup',config.Columniation.allowActionGroup);
      CurrentSession.setDefault('Selection.selector',config.Selection.selector);
      CurrentSession.setDefault('FieldSet.fields',_.reduce(config.FieldSet,function(ret,v,k){return (ret[k] = 1,ret)},{}));
      CurrentSession.setDefault('FieldSet.names_shows',config.FieldSet);
      CurrentSession.setDefault('Configuration.title',config.title);
      CurrentSession.setDefault('Configuration.globalAction',config.Global.action);
      CurrentSession.setDefault('Configuration.allowActionGroup',config.Global.allowActionGroup);
      CurrentSession.setDefault('GlobalData.checkedItems',[]);
      CurrentSession.setDefault('GlobalData.actions',config.ActionSet);
      var Grid = self = this;
      Grid.helpers({
        "__GridView_DataView__" : function(){
          return BaseComponent.extend({
            init : function(){
              var DataView = self = this;
              DataView.helpers({
                "__GridView_DataView_Fields__" : function(){
                  var CurrentSession = DataView.getSession();
                  var sortable = CurrentSession.get('Sortation.sortable');
                  var autoId = CurrentSession.get('Columniation.autoId');
                  var multiSelection = CurrentSession.get('Columniation.multiSelection');
                  var enableActionColumn = CurrentSession.get('Columniation.enableActionColumn');
                  var names_shows = CurrentSession.get('FieldSet.names_shows');
                  var sorters2Object = CurrentSession.get('Sortation.sorters2Object');
                  var events = {};
                  var heads = [];
                  if(autoId){
                    heads.push(HTML.TH({style : 'width:32px;text-align:left'},'#'));
                  }
                  if(multiSelection){
                    heads.push(HTML.TH({style : 'width:32px;'},HTML.INPUT({type : 'checkbox'})));
                    events['change th :checkbox'] = function(e){
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                      var CurrentSession = this.Session;
                      CurrentSession.set('GlobalData.checkedItems',[]);
                      var checkbox = $(e.target);
                      var table = checkbox.parents('table');
                      var checkboxChild = table.find('tbody td :checkbox');
                      checkboxChild.prop('checked',checkbox.prop('checked'));
                      checkboxChild.change();
                    };

                  }
                  if(sortable){
                    events['click th[class^="sorting"]'] = function(e){
                      e.stopAll();
                      var th = $(e.currentTarget);
                      var sortField = th.attr('sortField');
                      var CurrentSession = DataView.getSession();
                      var sorters2Object = CurrentSession.get('Sortation.sorters2Object');
                      var sortCombination = CurrentSession.get('Sortation.sortCombination');
                      if(!sorters2Object.hasOwnProperty(sortField)){
                        sorters2Object[sortField] = 0;
                      }
                      var sortValue = sorters2Object[sortField];
                      sortValue = [-1,0,1][(sortValue + 2) % 3];
                      if(!sortCombination){
                        sorters2Object = {};
                      }
                      sorters2Object[sortField] = sortValue;
                      if(sortValue === 0){
                        delete sorters2Object[sortField];
                      }
                      CurrentSession.set('Sortation.sorters2Object',sorters2Object);
                    }
                  }
                  _.map(names_shows,function(value,key){
                    var classType = SORTING_TYPES[1];
                    if(sorters2Object.hasOwnProperty(key)){
                      var sortValue = sorters2Object[key];
                      classType = SORTING_TYPES[sortValue + 1];
                    }
                    heads.push(HTML.TH({class : classType, sortField : key},value));
                  });
                  if(enableActionColumn){
                    heads.push(HTML.TH());
                  }
                  var temp = BaseComponent.extend({
                    render:function(){
                      return HTML.THEAD(
                        HTML.TR(heads)
                      );
                    }
                  });
                  temp.events(events);
                  return temp;
                },
                "__GridView_DataView_Datas__" : function(){
                  var self = CurrentScope = DataView.getScope();
                  var CurrentSession = self.Session;
                  var autoId = CurrentSession.get('Columniation.autoId');
                  var multiSelection = CurrentSession.get('Columniation.multiSelection');
                  var enableActionColumn = CurrentSession.get('Columniation.enableActionColumn');
                  var names_shows = CurrentSession.get('FieldSet.names_shows');
                  var sorters2Object = CurrentSession.get('Sortation.sorters2Object');
                  var temp = BaseComponent.extend({
                    render:function(){
                      var self = this;
                      return HTML.TBODY(
                        UI.Each(function(){
                          return Spacebars.call(self.lookup('__GridView_DataView_Datas_data__'));
                        },
                          UI.block(function(){
                            var self = this;
                            var cols = [];
                            if(autoId){
                              cols.push(HTML.TD(Spacebars.mustache(self.lookup('$id'))));
                            }
                            if(multiSelection){
                              cols.push(HTML.TD(HTML.INPUT({type : 'checkbox'})));
                            }
                            _.each(names_shows,function(value,key){
                              cols.push(HTML.TD(function(){
                                var format = FormationSet.get(CurrentScope.Collection._name + '.' + key);
                                if(format){
                                  return format.call(undefined,Spacebars.dot(self.lookup('.'),key));
                                }else{
                                  return Spacebars.mustache(Spacebars.dot(self.lookup('.'),key));
                                }
                              }));
                            });
                            if(enableActionColumn){
                              var Actions = CurrentSession.get('GlobalData.actions');
                              var actions = CurrentSession.get('Columniation.action');
                              var events = {};
                              if(CurrentSession.get('Columniation.allowActionGroup')){
                                var actionArray = _.map(actions,function(name){
                                  events['click .' + name] = ActionSet.get(name);
                                  return HTML.LI(
                                    HTML.A({class : name, href : HTML_A_HREF_DEFAULT},Actions[name])
                                  )
                                });
                                cols.push(HTML.TD(
                                  HTML.SPAN({class : 'dropdown'},[
                                    HTML.A({class : 'btn btn-default btn-xs', "data-toggle" : 'dropdown', href:HTML_A_HREF_DEFAULT},[
                                      '操作',
                                      HTML.SPAN({class : 'caret'})
                                    ]),
                                    HTML.UL({class : 'dropdown-menu'},actionArray)
                                  ])
                                ));
                              }else{
                                var actionArray = _.map(actions,function(name){
                                  events['click .' + name] = ActionSet.get(name);
                                  return HTML.BUTTON({class : 'btn btn-default btn-xs ' + name},
                                      Actions[name]
                                  );
                                });
                                cols.push(HTML.TD(
                                  HTML.DIV({class : 'btn-group'},actionArray)
                                ));
                              }
                              self.events(events);
                            }
                            return HTML.TR(cols);
                          })
                        )
                      );
                    }
                  });
                  temp.__GridView_DataView_Datas_data__ = function(){
                    var self = DataView.getScope();
                    var Collection = self.Collection;
                    var CurrentSession = self.Session;
                    var pageLimit = CurrentSession.get('Pagination.pageLimit');
                    var skip = CurrentSession.get('Pagination.pageSkip');
                    var sorters2Object = CurrentSession.get('Sortation.sorters2Object');
                    var fields = CurrentSession.get('FieldSet.fields');
                    var selector = CurrentSession.get('Selection.selector');
                    var collectionName = Collection._name;
                    var index = 0;
                    return Collection.find(selector,{
                      limit : pageLimit,
                      skip : skip,
                      fields : fields,
                      sort : sorters2Object,
                      transform : function(doc){
                        doc.Scope = self;
                        doc.$id = ++index;
                        return doc;
                      }
                    });
                  };
                  var events = {};
                  if(multiSelection){
                    events['change :checkbox'] = function(e){
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                      var self = this;
                      var checkbox = $(e.target);
                      var CurrentSession = self.Scope.Session;
                      var checkedItems = CurrentSession.get('GlobalData.checkedItems');
                      if(checkbox.prop('checked')){
                        checkedItems.push(self._id);
                      }else{
                        checkedItems = _.without(checkedItems,self._id);
                      }
                      CurrentSession.set('GlobalData.checkedItems',checkedItems);
                      return false;
                    }
                  }
                  temp.events(events);
                  return temp;
                }
              });
            },
            /*
                {{> __GridView_DataView_Fields__}}
                {{> __GridView_DataView_Datas__}}
            */
            render:function(){
              var self = this;
              return [
                Spacebars.include(self.lookupTemplate('__GridView_DataView_Fields__')),
                Spacebars.include(self.lookupTemplate('__GridView_DataView_Datas__'))
              ];
            }
          })
        }
      });
    },
    /*
        <div class="table-responsive">
          <table>
            {{__GridView_DataView__}}
          </table>
          {{> __GridView_Pagination__}}
        </div>
    */
    render : function(){
      var self = this;
      return HTML.DIV({class : 'table-responsive'},[
        HTML.TABLE({class : 'table table-striped table-hover table-bordered '},
          Spacebars.include(self.lookupTemplate('__GridView_DataView__'))
        ),
        Spacebars.include(self.lookupTemplate('__GridView_Pagination__'))
      ]);
    }
  });
  Handlebars.registerHelper('Grid',function(){
    var component = this;
    var name = component.name;
    if(!name){throw new Meteor.Error(500,'必须配置name，例如{{> GridView name=\"uesrGrid\"}}或者{{#GridView name=\"uesrGrid\"}}{{/GridView}}'); }
    if(!Collection.has('GridManager')){
      Collection.define('GridManager');
    }
    var config = Collection.get('GridManager').findOne({name:name});
    if(!config){return null; }
    var source = Collection.get(config.sourceName);
    if(!source){return null; }
    component.config = config;
    component.Collection = source;
    return GridComponent;
  });
})();