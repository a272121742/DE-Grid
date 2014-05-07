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
    __helperHost:true
  });
  //视图组件
  var GridComponent = BaseComponent.extend({
    init:function(){
      var Grid = self = this;
      Grid.helpers({
        "__GridView_Header__" : function(){
          return BaseComponent.extend({
            init : function(){
              var Header = self = this;
              Header.helpers({
                "title" : function(){
                  var CurrentSession = this.Session;
                  return CurrentSession.get('Configuration.title');
                }
              });
            },
            render:function(){
              var Header = self = this;
              var result = [
                HTML.H4([
                  HTML.I({class:'glyphicon glyphicon-list'}),
                  HTML.Raw('&nbsp;&nbsp;'),
                  Spacebars.mustache(self.lookup('title')),
                  HTML.Raw('&nbsp;&nbsp;')
                ]),
                HTML.SPAN({class:'tools'},[
                  HTML.A({class:'icon-chevron-down',href:HTML_A_HREF_DEFAULT}),
                  HTML.A({class:'icon-remove',href:HTML_A_HREF_DEFAULT})
                ])
              ];
              var CurrentSession = Header.Scope.Session;
              var Actions = CurrentSession.get('GlobalData.actions');
              var actions = CurrentSession.get('Configuration.globalAction');
              var events = {};
              if(CurrentSession.get('Configuration.allowActionGroup')){
                var actionArray = _.map(actions,function(name){
                  events['click .' + name] = ActionSet.get(name);
                  return HTML.LI(
                    HTML.A({class : name, href : HTML_A_HREF_DEFAULT},Actions[name])
                  )
                });
                result.push(HTML.SPAN({class : 'dropdown pull-right'},[
                  HTML.A({class : 'btn btn-default', "data-toggle" : 'dropdown', href:HTML_A_HREF_DEFAULT},[
                    '操作',
                    HTML.SPAN({class : 'caret'})
                  ]),
                  HTML.UL({class : 'dropdown-menu'},actionArray)
                ]));
              }else{
                var actionArray = _.map(actions,function(name){
                  events['click .' + name] = ActionSet.get(name);
                  return HTML.BUTTON({class : 'btn btn-default ' + name},
                      Actions[name]
                  );
                });
                result.push(HTML.DIV({class : 'btn-group pull-right'},actionArray));
              }
              events['click span.tools a.icon-chevron-down'] = function(e){
                e.stopAll();
                var widget_body = $(e.currentTarget).parents('div.widget').find('div.widget-body');
                widget_body.slideToggle();
              };
              events['click span.tools a.icon-remove'] = function(e){
                var widget = $(e.currentTarget).parents('div.widget');
                widget.remove();
              };
              Header.events(events);
              return result;
            }
          })
        },
        "__GridView_DataView__" : function(){
          return BaseComponent.extend({
            init : function(){
              var DataView = self = this;
              DataView.helpers({
                "__GridView_DataView_Fields__" : function(){
                  var CurrentSession = this.Session;
                  var sortable = CurrentSession.get('Sortation.sortable');
                  var multiSelection = CurrentSession.get('Columniation.multiSelection');
                  var enableActionColumn = CurrentSession.get('Columniation.enableActionColumn');
                  var names_shows = CurrentSession.get('FieldSet.names_shows');
                  var sorters2Object = CurrentSession.get('Sortation.sorters2Object');
                  var events = {};
                  var heads = [];
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
                      var CurrentSession = this.Session;
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
                  var self = CurrentScope = this;
                  var CurrentSession = self.Session;
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
                            if(multiSelection){
                              cols.push(HTML.TD(HTML.INPUT({type : 'checkbox'})));
                            }
                            _.each(names_shows,function(value,key){
                              cols.push(HTML.TD(function(){
                                return Spacebars.mustache(self.lookup(key));
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
                    var self = this;
                    var Collection = self.Collection;
                    var CurrentSession = self.Session;
                    var pageLimit = CurrentSession.get('Pagination.pageLimit');
                    var skip = CurrentSession.get('Pagination.pageSkip');
                    var sorters2Object = CurrentSession.get('Sortation.sorters2Object');
                    var fields = CurrentSession.get('FieldSet.fields');
                    var selector = CurrentSession.get('Selection.selector');
                    return Collection.find(selector,{
                      limit : pageLimit,
                      skip : skip,
                      fields : fields,
                      sort : sorters2Object,
                      transform : function(doc){
                        doc.Scope = self;
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
            render:function(){
              var self = this;
              return [
                Spacebars.include(self.lookupTemplate('__GridView_DataView_Fields__')),
                Spacebars.include(self.lookupTemplate('__GridView_DataView_Datas__'))
              ];
            }
          })
        },
        "__GridView_Pagination__" : function(){
          return BaseComponent.extend({
            init:function(){
              var Pagination = self = this;
              Pagination.helpers({
                "__GridView_Page_first__" : function(){
                  var CurrentSession = this.Session;
                  var currentNumber = CurrentSession.get('Pagination.currentNumber');
                  var classType = currentNumber === 1 ? 'disabled' : 'enabled';
                  return BaseComponent.extend({
                    render:function(){
                      return HTML.LI({class : classType},
                        HTML.A({href : HTML_A_HREF_DEFAULT, currentNumber : 1},
                          CurrentSession.get('Pagination.pageFirst')
                        )
                      );
                    }
                  });
                },
                "__GridView_Page_prev__" : function(){
                  var CurrentSession = this.Session;
                  var currentNumber = CurrentSession.get('Pagination.currentNumber');
                  var classType = currentNumber === 1 ? 'disabled' : 'enabled';
                  return BaseComponent.extend({
                    render:function(){
                      return HTML.LI({class : classType},
                        HTML.A({href : HTML_A_HREF_DEFAULT, currentNumber : --currentNumber},
                          CurrentSession.get('Pagination.pagePrev')
                        )
                      );
                    }
                  });
                },
                "__GridView_Page_before__" : function(){
                  var CurrentSession = this.Session;
                  var hasBefore = CurrentSession.get('Pagination.hasBefore');
                  return hasBefore ? BaseComponent.extend({
                    render:function(){
                      return HTML.LI({class : 'disabled'},
                        HTML.SPAN(
                          CurrentSession.get('Pagination.pageBefore')
                        )
                      );
                    }
                  }) : null;
                },
                "__GridView_Page_numbers__" : function(){
                  var CurrentSession = this.Session;
                  var currentNumber = CurrentSession.get('Pagination.currentNumber');
                  var showNumbers = CurrentSession.get('Pagination.showNumbers');
                  return BaseComponent.extend({
                    render:function(){
                      return _.reduce(showNumbers,function(ret,number){
                        ret.push(HTML.LI({class : currentNumber === number ? 'active' : 'enabled'},
                          HTML.A({href : HTML_A_HREF_DEFAULT,currentNumber : number},
                            number
                          )
                        ));
                        return ret;
                      },[]);
                    }
                  });
                },
                "__GridView_Page_after__" : function(){
                  var CurrentSession = this.Session;
                  var hasAfter = CurrentSession.get('Pagination.hasAfter');
                  return hasAfter ? BaseComponent.extend({
                    render:function(){
                      return HTML.LI({class : 'disabled'},
                        HTML.SPAN(
                          CurrentSession.get('Pagination.pageAfter')
                        )
                      );
                    }
                  }) : null;
                },
                "__GridView_Page_next__" : function(){
                  var CurrentSession = this.Session;
                  var currentNumber = CurrentSession.get('Pagination.currentNumber');
                  var pageCount = CurrentSession.get('Pagination.pageCount');
                  var classType = currentNumber === pageCount ? 'disabled' : 'enabled';
                  return BaseComponent.extend({
                    render:function(){
                      return HTML.LI({class : classType},
                        HTML.A({href : HTML_A_HREF_DEFAULT, currentNumber : ++currentNumber},
                          CurrentSession.get('Pagination.pageNext')
                        )
                      );
                    }
                  });
                },
                "__GridView_Page_last__" : function(){
                  var CurrentSession = this.Session;
                  var currentNumber = CurrentSession.get('Pagination.currentNumber');
                  var pageCount = CurrentSession.get('Pagination.pageCount');
                  var classType = currentNumber === pageCount ? 'disabled' : 'enabled';
                  return BaseComponent.extend({
                    render:function(){
                      return HTML.LI({class : classType},
                        HTML.A({href : HTML_A_HREF_DEFAULT, currentNumber : pageCount},
                          CurrentSession.get('Pagination.pageLast')
                        )
                      );
                    }
                  });
                },
                "__GridView_Page_info__" : function(){
                  var CurrentSession = this.Session;
                  var CurrentCollection = this.Collection;
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
                  return BaseComponent.extend({
                    render:function() {
                      var self = this;
                      return HTML.LI(HTML.SPAN(pageInfo));
                    }
                  });
                },
                "__GridView_Page_limitSelection__" : function(){
                  var CurrentSession = this.Session;
                  var enableLimitSelection = CurrentSession.get('Pagination.enableLimitSelection');
                  if(enableLimitSelection){
                    var pageLimit = CurrentSession.get('Pagination.pageLimit');
                    var pageLimitArray = CurrentSession.get('Pagination.pageLimitArray');
                    var pageDropdownMenu = HTML.UL({class : 'dropdown-menu'},
                      _.reduce(pageLimitArray,function(ret,item){
                        ret.push(HTML.LI(
                          HTML.A({href : HTML_A_HREF_DEFAULT},
                            item
                          )
                        ));
                        return ret;
                      },[])
                    );
                    var temp = BaseComponent.extend({
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
                    temp.events({
                      'click ul.dropdown-menu li a':function(e){
                        e.stopAll();
                        var pageLimit = parseInt($(e.target).html());
                        this.Session.set('Pagination.currentNumber',1);
                        this.Session.set('Pagination.pageLimit',pageLimit);
                      }
                    });
                    return temp;
                  }
                }
              });
              Pagination.events({
                "click li.enabled a":function(e){
                  e.stopAll();
                  var currentNumber = parseInt($(e.target).attr('currentNumber'));
                  currentNumber = currentNumber > 0 ? currentNumber : 1;
                  this.Session.set('Pagination.currentNumber',currentNumber);
                }
              });
            },
            render:function(){
              return HTML.UL({class : 'pagination'},[
                Spacebars.include(self.lookupTemplate('__GridView_Page_first__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_prev__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_before__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_numbers__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_after__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_next__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_last__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_info__')),
                Spacebars.include(self.lookupTemplate('__GridView_Page_limitSelection__'))
              ]);
            }
          })
        }
      });
    },
    render:function(){
      var self = this;
      self.Filter = BaseComponent.extend({
        render:function(){
          var show = this.get('show');
          var style = show === false ? 'display: none;' : 'display: block;';
          return HTML.DIV({class : 'grid-filter', style : style},this.__content);
        }
      });
      self.Form = BaseComponent.extend({
        render:function(){
          var show = this.get('show');
          var style = show === false ? 'display: none;' : 'display: block;';
          return HTML.DIV({class : 'grid-form', style : style},this.__content);
        }
      });
      return HTML.DIV({class : 'widget'},[
        HTML.DIV({class : 'widget-title'},
          Spacebars.include(self.lookupTemplate('__GridView_Header__'))),
        HTML.DIV({class : 'widget-body table-responsive'},[
          self.__content,
          HTML.TABLE({class : 'table table-striped table-hover table-bordered table-condensed'},
            Spacebars.include(self.lookupTemplate('__GridView_DataView__'))),
          Spacebars.include(self.lookupTemplate('__GridView_Pagination__'))
        ])
      ]);
    }
  });
  Handlebars.registerHelper('GridView',function(){
    //定义当前对象即其所有子组件的作用域
    var CurrentScope = this;
    //获取name配置
    var name = CurrentScope.name;
    //检测name属性是否被配置过
    if(!name){
      throw new Meteor.Error(500,'必须配置name，例如{{> GridView name=\"uesrGrid\"}}或者{{#GridView name=\"uesrGrid\"}}{{/GridView}}');
    }
    /**
     * 从数据库中获取配置文件，完整的配置文件如下：
     * config = {
     *  //Grid的标题，默认值"列表"
     *  title : '列表'
     *  ActionSet : {
     *    action1 : '操作1',
     *    action2 : '操作2'
     *  },
     *  FieldSet : {
     *    name : '姓名',      //以"存储名:显示名"这样的键值对存储
     *    birthday : '生日'
     *  },
     *  Global : {
     *    action : ['action1','action2'],   //这里配置数组，数组项必须是之前ActionSet所配置过的name
     *    allowActionGroup : false          //是否启用操作组，如果启用，则以下拉列表的方式展示
     *  },
     *  Sortation : {
     *    sortable : true,
     *    sortCombination : false,
     *    sorters2Object : {}
     *  },
     *  Pagination : {
     *    pageFirst : '首页',
     *    pagePrev : '上一页',
     *    pageNext : '下一页',
     *    pageLast : '末页',
     *    pageInfo : '当前 {{currentNumber}} / {{pageCount}} 页 | 共 {{dataTotal}} 行',
     *    showNumberLevel : 2,
     *    enableLimitSelection : true,
     *    pageLimitArray : [5,10,20,50]
     *  },
     *  Columniation : {
     *    multiSelection : true,
     *    enableActionColumn : true,
     *    allowActionGroup : false,
     *    action : ['action1','action2']    //这里配置数组，数组项必须是之前ActionSet所配置过的name
     *  }
     *  Selection : {
     *    selector : {}
     *  }
     * }
     */
    var config = Collection.get('GridManager').findOne({name:name});
    if(!config){
      return null;
    }
    var source = Collection.get(config.sourceName);
    if(!source || !(source instanceof Meteor.Collection)){
      throw new Meteor.Error(500,'源码文件配置错误','配置的数据源必须是Meteor.Collection实例对象');
    }
    //获取数据源配置
    CurrentScope.Collection = source;
    //默认值填充
    _.defaults(config,{
      title : '列表',
      ActionSet : [],
      FieldSet : {},
      Global : {},
      Sortation : {},
      Pagination : {},
      Columniation : {},
      Selection : {},
    });
    _.defaults(config.Global,{
      action : [],
      allowActionGroup : false
    });
    _.defaults(config.Sortation,{
      sortable : true,
      sortCombination : false,
      sorters2Object : {},
    });
    _.defaults(config.Pagination,{
      pageFirst : '首页',
      pagePrev : '上一页',
      pageNext : '下一页',
      pageLast : '末页',
      pageInfo : '当前 {{currentNumber}} / {{pageCount}} 页 | 共 {{dataTotal}} 行',
      showNumberLevel : 2,
      enableLimitSelection : true,
      pageLimitArray : [5,10,20,50]
    });
    _.defaults(config.Columniation,{
      multiSelection : true,
      enableActionColumn : true,
      allowActionGroup : false,
      action : []
    });
    _.defaults(config.Selection,{
      selector : {}
    });
    if(Match.test(config.FieldSet,{})){
      throw new Meteor.Error(500,'必须配置查询的字段集','请检查数据库中是否为FieldSet赋值了多个可用查询对象！');
    }
    //创建作用域Session环境
    var CurrentSession = CurrentScope.Session = new ReactiveDict();
    //Sortation
    /**
     *  description :  是否启用排序
     *  type        :  Boolean
     *  default     :  false (不启用)
     */
    CurrentSession.setDefault('Sortation.sortable',config.Sortation.sortable);
    /**
     *  description :  是否支持组合排序
     *  type        :  Boolean
     *  default     :  false (不启用)
     */
    CurrentSession.setDefault('Sortation.sortCombination',config.Sortation.sortCombination);
    /**
     *  description :  排序方式对象
     *  type        :  JSON
     *  default     :  {} (在MongoDB中会默认采用_id倒序排列)
     *  example     :  CurrentSession.set('Sortation.sorters2Object',{_id:-1,name:0,age:1});
     *                 {_id:-1,name:0,age:1} (-1表示按此字段倒序排列，0表示此字段不参与排列，1表示按此字段正序排列)
     */
    CurrentSession.setDefault('Sortation.sorters2Object',config.Sortation.sorters2Object);

    //Pagination
    /**
     *  description :  分页数
     *  type        :  Number
     *  default     :  5 (每一页5行数据)
     */
    CurrentSession.setDefault('Pagination.pageLimit',config.Pagination.pageLimitArray[0]);
    /**
     *  description :  分页跳帧
     *  type        :  Number
     *  default     :  0 (从数据库数据的第0行数据开始取数据)
     *  example     :  pageSkip = n (从数据库数据的第n行数据开始取数据)
     */
    CurrentSession.setDefault('Pagination.pageSkip',0);
    /**
     *  description :  当前页
     *  type        :  Number
     *  default     :  1 (当前页是第一页)
     */
    CurrentSession.setDefault('Pagination.currentNumber',1);
    /**
     *  description :  数据总数
     *  type        :  Number
     *  default     :  0 (表示没有获取，获取后值会发生改变)
     */
    CurrentSession.setDefault('Pagination.dataTotal',0);
    /**
     *  description :  总页数
     *  type        :  Number
     *  default     :  0 (表示没有获取，获取后值会发生改变)
     */
    CurrentSession.setDefault('Pagination.pageCount',0);
    /**
     *  description :  首页显示字符串
     *  type        :  String
     *  default     :  '首页' (替换成其他字符串后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pageFirst',config.Pagination.pageFirst);
    /**
     *  description :  上一页显示字符串
     *  type        :  String
     *  default     :  '上一页' (替换成其他字符串后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pagePrev',config.Pagination.pagePrev);
    /**
     *  description :  是否有前页
     *  type        :  Boolean
     *  default     :  false (表示没有前页)
     */
    CurrentSession.setDefault('Pagination.hasBefore',false);
    /**
     *  description :  前页显示字符串
     *  type        :  String
     *  default     :  '...' (替换成其他字符串后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pageBefore','...');
    /**
     *  description :  展示数字
     *  type        :  [Number]
     *  default     :  [] (经过计算得出)
     */
    CurrentSession.setDefault('Pagination.showNumbers',[]);
    /**
     *  description :  展示数字等级
     *  type        :  Number
     *  default     :  2 (显示3个数字)
     *  example     :  showNumberLevel = n (显示 n * 2 - 1 个数字)
     */
    CurrentSession.setDefault('Pagination.showNumberLevel',config.Pagination.showNumberLevel);
    /**
     *  description :  是否有后页
     *  type        :  Boolean
     *  default     :  false (表示没有后页)
     *  example     :  showNumberLevel = n (显示 n * 2 - 1 个数字)
     */
    CurrentSession.setDefault('Pagination.hasAfter',false);
    /**
     *  description :  后页显示字符串
     *  type        :  String
     *  default     :  '...' (替换成其他字符串后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pageAfter','...');
    /**
     *  description :  下一页显示字符串
     *  type        :  String
     *  default     :  '下一页' (替换成其他字符串后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pageNext',config.Pagination.pageNext);
    /**
     *  description :  末页显示字符串
     *  type        :  String
     *  default     :  '末页' (替换成其他字符串后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pageLast',config.Pagination.pageLast);
    /**
     *  description :  显示信息
     *  type        :  String
     *  default     :  '当前 {{currentNumber}} / {{pageCount}} 页 | 共 {{dataTotal}} 行' (替换成其他字符串后，显示将改变)
     *  example     :  pageInfo = '总数据：{{dataTotal}}，当前{{currentNumber}}页' (提供3个占位符)
     */
    CurrentSession.setDefault('Pagination.pageInfo',config.Pagination.pageInfo);
    /**
     *  description :  是否启用分页选择
     *  type        :  Boolean
     *  default     :  false (不启用分页选择)
     */
    CurrentSession.setDefault('Pagination.enableLimitSelection',config.Pagination.enableLimitSelection);
    /**
     *  description :  分页选择可选项
     *  type        :  [Number]
     *  default     :  [5,10,20,50] (替换成其他数组后，显示将改变)
     */
    CurrentSession.setDefault('Pagination.pageLimitArray',config.Pagination.pageLimitArray);
    //DataView
    /**
     *  description :  是否启用多行选择模式
     *  type        :  Boolean
     *  default     :  false (不启用多行选择)
     */
    CurrentSession.setDefault('Columniation.multiSelection',config.Columniation.multiSelection);
    /**
     *  description :  是否启用操作列
     *  type        :  Boolean
     *  default     :  false (不启用)
     */
    CurrentSession.setDefault('Columniation.enableActionColumn',config.Columniation.enableActionColumn);
    /**
     *  description :  操作列表
     *  type        :  [String]
     *  default     :  [] (无操作绑定)
     */
    CurrentSession.setDefault('Columniation.action',config.Columniation.action);
    //允许下拉的最大数量//
    /**
     *  description :  是否启用操作组
     *  type        :  Boolean
     *  default     :  false (不启用)
     */
    CurrentSession.setDefault('Columniation.allowActionGroup',config.Columniation.allowActionGroup);
    //Selection
    /**
     *  description :  查询对象
     *  type        :  JSON
     *  default     :  {} (数据全查询)
     *  example     :  selector = {age : {$gt : 18}} (搜索年龄大于18岁的)
     */
    CurrentSession.setDefault('Selection.selector',config.Selection.selector);
    //FieldSet
    /**
     *  description :  查询字段
     *  type        :  JSON
     *  default     :  {} (字段全查询)
     *  example     :  fields = {name : 1, createDate : 0} (显示name属性，但不显示createDate属性)
     */
    CurrentSession.setDefault('FieldSet.fields',_.reduce(config.FieldSet,function(ret,v,k){return (ret[k] = 1,ret)},{}));
    /**
     *  description :  显示列
     *  type        :  [JSON]
     *  default     :  GridManager[name].fields (从配置文件中读取)
     *  example     :  fields = [{name : 'name', show : '姓名'}] (将name属性显示为“姓名”字符串)
     */
    CurrentSession.setDefault('FieldSet.names_shows',config.FieldSet);
    //Configuration
    /**
     *  description :  标题
     *  type        :  String
     *  default     :  '' (空字符串)
     */
    CurrentSession.setDefault('Configuration.title',config.title);
    /**
     *  description :  全局操作列表
     *  type        :  [String]
     *  default     :  [] (无全局操作绑定)
     */
    CurrentSession.setDefault('Configuration.globalAction',config.Global.action);
    /**
     *  description :  是否启用操作组
     *  type        :  Boolean
     *  default     :  false (不启用)
     */
    CurrentSession.setDefault('Configuration.allowActionGroup',config.Global.allowActionGroup);
    //GlobalData
    /**
     *  description :  已选项列表
     *  type        :  [String]
     *  default     :  [] (无)
     */
    CurrentSession.setDefault('GlobalData.checkedItems',[]);
    // 作用域中添加所有的可选操作
    CurrentSession.setDefault('GlobalData.actions',config.ActionSet);
    BaseComponent.Scope = CurrentScope;
    return GridComponent;
  });
})();