<<<<<<< HEAD
结构说明
====================

##  设计概要

Meteor-0.8.0的很多东西都是比较新的，对于我来说，是一个比较大的挑战。但是这个新版本同时又是比较诱人的，其中很多功能上的细节让编程变的更加灵活，同时性能上也得到了很大的提升。一开始想要能深入到0.8的核心当中去是比较困难的，即便是现在已经深入进去，也发现官方并没有将这些底层公布出来。在已经掌握一些底层的知识和原理上，开始做这个封装package。当然一开始不可能从头到尾龙会贯通，需要一点点的尝试。从最开始挖掘我们所需要的功能，到基础案例的编写，再到可行性的论证。当单个基础模型搭建完成后，接着就是如何将这些模型组装起来。组装就会显得尤为麻烦，因为每一个基础案例都是单独可运行的，并没有从全局或者更大的环境、资源、需求、便携性等角度思考。但是随着拼凑的结果，渐渐有了一些贯通，并再次从头到位重构了这样一个package。下面，就是针对我们要实现的功能细节进行详细讲解。

##  功能细节

### 隔离性

在Meteor之前的版本中，模板虽然可以重用，其功能也会被重复触发。如果你确定一个页面只会用一套模板，那样并不冲突。但是现实往往是多样化的需求，我们有时候需要在一个页面用到多个模板。这样理解的话，我们就需要定制新的模板，让模板的重用不仅可以达到数据级展示，也能针对功能。

那么首先我们就要理解Meteor里，究竟什么是模板？

在Meteor的世界里，模板有3种：

第一种是带有数据展示的Template，这个名词正如他所表达的含义，他是最基本的模板，也是之后很多模板的容器。

第二种就是提供数据跟踪的Helper模板，他的作用是专门跟踪Template中所引用的Helper数据，在将正确的数据显示到他应该到达的位置上并实时监听其变化。

第三种是进行数据行为的GlobalHelper模板，他的作用是能够对数据进行行为上的解析，例如：判断、运算、遍历等。

正如一套完整的模板所展示的：

```
<!--模板的定义-->
<template name="temp">
  <!--模板的使用-->
  {{> otherTemp}}
  {{#each obj}}
    {{name}}
    {{age}}
  {{/each}}
</template>
```

虽然GlobalHelper是控制数据的行为，但是并不是控制交互行为的。如果我们在模板中添加交互行为的原件，例如：按钮，并且给他一个特定的行为。我们会发现，当模板在一个页面被多次用到的时候，某一个被引用模板的交互行为发生，会引起其他被引用模板交互行为的同时发生。

为了解决这样一个问题，我们需要控制好两个方面：一方面，我们需要被引用的模板是同一个模板表达式，但最终应该被渲染成不同的对象。另一方面，我们需要控制事件的传播，因为交互行为确确实实是作用在这个模板上的，而不管是这个模板生产的哪个对象。

解决方面一，我看到了GlobalHelper的实例化过程：

```
UI.registerHelper('globalHelperName',funciton globalHelperAction(){
  //action
});
```

我对模板的预期其实就同这里展示的函数一样，同一个函数在不同地方执行时，他们所指向的对象内存是不一样的。这样，就能很好的控制模板生成的对象是不一样的。

解决另一方面，就是需要控制事件。Meteor的client端采用的都是原生的jQuery事件，那么只要查阅文档，就很轻松搞定。我们对jQuery的Event元素进行了扩展，增加了`stopAll`方法，防止元素触发事件会被冒泡。

由此，独立且不会被传播，正是我们预期的结果。

### 组件化

既然是要做一个良好的封装，那么就不得不将我们的视图或者封装的内容组件化，这将提供更多的粒度化和灵活性。在Meteor中，仅仅只是提供了Template和GlobalHelper两个可以组件化的模型。但是Template是视图层的组件化，GlobalHelper是定义在应用层却提供视图功能扩展。如果，Template也能在应用层编写，那么代码中无论是数据还是展示亦或者功能，将都变得统一可管理。在Meteor中，提供了`UI.Component`对象，我对这个对象很有兴趣，因为他让我敏感到他也许就是组件化的入口。通过查看源码以及其他码农的编写结果，发现我们可以在此基础上进行扩展：

```
var BaseComponent = UI.Component({
  init:function(){},
  render:function(){}
});
```

通过查看具体的Template模板，也不难发现，我们在视图层手写的模板最终也会被转为JS对象。与其他进行转换，不如我们自己手写吧。这样，组件化就被轻松攻破。

### 动态组件化

对于不同的应用场景，我们可能拥有同一个需求，但是处理的数据可能不一样。例如某些表格显示某些字段，另外某些表格显示跟之前不同的字段。但是业务的场景是一样的，我们都需要渲染字段，只是渲染的字段逻辑名称不一样而已。此时，我们就不得不考虑组件的动态化了。

既然我们已经提供了组件化可用代码实现，那么使用工厂模式，就很容易实现动态化组件。但是动态化的依据仍然是数据，我们应该将这些数据保存在更为明显的地方，这就是作用域。

### 作用域

如之前所说，数据需要存在更明显的地方。顶层的全局环境是一个不错的地方，但这出现必要的代码污染。对应其他图形化编程工具不难发现，每个组件必须有个作用域，其子件的运行都离不开这个作用域环境。我们既然已经解决了隔离性的问题，那么在注册GlobalHelper的同时，就能给他一个作用域，并且将其传递下去：

```
UI.registerHelper('GridView',function(){
  var Component = UI.Component({});
  var Scope = this;
  Component.Scope = Scope;
  return Component;  
});
```

### 传递性

我们是用`extend`继承性来实现作用域传递的。这样子件也能享受到对Scope的操作。

### 子组件

如果我们希望写出这样的代码：

```
{{#GridView}}
  {{> DataView}}
  {{> Pagination}}
{{/GridView}}
```

那么我们就要把定义的子件（DataView、Pagination）丢到父件（GridView）中去，很奇怪的的是，Meteor并不能像Java那样，子件既然是继承自父件，就应该很容易找到其父类。一方面在代码上是直接继承，但是在渲染中，中间可能会有好几个临时组件被包裹。这一点可以理解为前端的视图组件，肯定会对DOM做重绘。另一方面，继承并不代表子件可以出现在父件内部。我们需要通过代码手动实现：

```
var GridView = UI.Component({
  render:function(){
    this.DataView = DataView;
    this.Pagination = Pagination;
    return this.__content;
  }
});
```

### 自定义内容

组件内部，除了可以是子件，还可以有自定义内容。并且自定义内容也享有组件作用域。我们通过上面的`this.__content`就可以实现，这也表明，子件也是组件的自定义内容，只不过他是已经被提前定义好的。代码在读到DataView的时候，就会按照已经定义好的组件去渲染。否则，就按照自定义的内容渲染。

### 配置化

为了让组件更加的灵活，我们提供了两种方式的配置。一种是视图配置，视图的配置提供了展示上的变化。另一种是代码配置，代码配置将是所有配置中最为重要的。理论上两种配置是可以相互转换的，根据之后的需求，我们会进行相应的调整。

```
<!--视图配置-->
{{#Configuration}}
  {{> Title title="排水泵站"}}
  {{> Action bind="action1" enableActionGroup=true}}
{{/Configuration}}

{{#DataView}}
  {{> Sortation name=-1}}
{{/DataView}}
{{> Pagination}}

//代码配置
Manager = {
  'userGrid':{
    actions:[{
      name:'action1',
      show:'操作1',
      handler:function(){}
    }]
  }
}
```

### 实时响应

Meteor中有两种数据是可以做到实时的，一种是Collection，另一种是Session。当然Helper函数也是实时的，但他依据你的数据源是否也是实时的，否则他的函数执行返回的也是固定数据，而不是一个程序钩子。

但在Meteor中有另外两个实时的数据源，一个是Meteor自带的`Deps.Dependency`，他需要手动跟踪数据的变化并手动改变目标。另外一个就是需要引入Meteor自带的名为reactive-dict的包。拥有他，就像拥有Session一样，其实他的功能非常接近Session，但Session是全局的，他是局部的。那么有了他，我们可以让作用域存储一些数据，并由这些数据分散到各个需要展示的地方以及配置。一旦有交互引用或者配置变更，都将影响这个数据源，而最终得到的效果即我们不需要手动刷新，那些数据或者展示效果也就发生了变化。

那么我们将设计如下的配置数据源，提供给我们现有的架构：

####  Sortation排序对象

##### sortable

也许并不是所有的表单都需要排序，所以提供这样的配置以供修改。

```
/**
 *  description :  是否启用排序
 *  type        :  Boolean
 *  default     :  false (不启用)
 */
CurrentSession.setDefault('Sortation.sortable',false);
```

##### sortCombination

MongoDB其实是支持组合排序的，但是组合排序有时候会让人感觉展示的变化不大，因为对于一些用户，就是很单纯的希望看到数据按照我指定的某一个字段发生排序变化。因此我们提供这样的接口并暂时设置为false，也就是单排序功能。如果你希望启用他，可以通过配置的方式修改他。

```
/**
 *  description :  是否支持组合排序
 *  type        :  Boolean
 *  default     :  false (不启用)
 */
CurrentSession.setDefault('Sortation.sortCombination',false);
```

##### sorters2Object

如果希望初始化显示某种排序方式，这个配置将会非常有用。他是直接应用在Mongo查询中的，所以你需要稍微了解Mongo的查询方式。

```
/**
 *  description :  排序方式对象
 *  type        :  JSON
 *  default     :  {} (在MongoDB中会默认采用_id倒序排列)
 *  example     :  CurrentSession.set('Sortation.sorters2Object',{_id:-1,name:0,age:1});
 *                 {_id:-1,name:0,age:1} (-1表示按此字段倒序排列，0表示此字段不参与排列，1表示按此字段正序排列)
 */
CurrentSession.setDefault('Sortation.sorters2Object',{});
```

#### Pagination

分页器是其中一个比较难的算法问题，他也提供可一些好的UI效果展示，因此他的配置会更多。

##### pageLimit/pageSkip/currentNumber/dataTotal/pageCount

这是一个很明显的话题，数据不可能全部展示，因此分页的展示和动态特效就由这些数据控制。将他们保存起来，可以更方便的的读取，例如

```
/**
 *  description :  分页数
 *  type        :  Number
 *  default     :  5 (每一页5行数据)
 */
CurrentSession.setDefault('Pagination.pageLimit',5);
```

##### pageFirst/pagePrev/pageBefore/pageAfter/pageNext/pageBefore

这些配置都是针对显示，当然我们不会改变他的功能。如果你希望更加简单，可以设置`pageFirst＝"<<"`，这样他就会以符号的形式展现。例如：

```
/**
 *  description :  首页显示字符串
 *  type        :  String
 *  default     :  '首页' (替换成其他字符串后，显示将改变)
 */
CurrentSession.setDefault('Pagination.pageFirst','首页');
```

##### hasBefore/hasAfter

pageBefore/pageAfter是值得商榷的两个配置，因为设计他只是为了好看，但是他们的算法却非常麻烦，是否希望他们出现，就是由这两个属性控制：

```
/**
 *  description :  是否有前页
 *  type        :  Boolean
 *  default     :  false (表示没有前页)
 */
CurrentSession.setDefault('Pagination.hasBefore',true);
```

##### pageInfo

当然，分页器上也会显示一些其他数据，例如总数、当前页等等，这里我们提供了占位符来实现：

```
/**
 *  description :  显示信息
 *  type        :  String
 *  default     :  '当前 {{currentNumber}} / {{pageCount}} 页 | 共 {{dataTotal}} 行' (替换成其他字符串后，显示将改变)
 *  example     :  pageInfo = '总数据：{{dataTotal}}，当前{{currentNumber}}页' (提供3个占位符)
 */
CurrentSession.setDefault('Pagination.pageInfo','当前 {{currentNumber}} / {{pageCount}} 页 | 共 {{dataTotal}} 行');
```

##### enableLimitSelection

事实上，绝大部分表格都会有改变分页的选项。但是为了保证UI的固定，我们默认情况下禁用此选项。如果你希望启用，就通过此接口修改。

```
/**
 *  description :  是否启用分页选择
 *  type        :  Boolean
 *  default     :  false (不启用分页选择)
 */
CurrentSession.setDefault('Pagination.enableLimitSelection',false);
```

##### pageLimitArray

另外我们为选择分页数也提供了可选配置，如果你是一个超大的页面，也可以配置像“[20,50,100]”这样的值。

```
/**
 *  description :  分页选择可选项
 *  type        :  [Number]
 *  default     :  [5,10,20,50] (替换成其他数组后，显示将改变)
 */
CurrentSession.setDefault('Pagination.pageLimitArray',[5,10,20,50]);
```

#### DataView

##### multiSelection

某些情况下，业务人员希望能通过多选的方式来减少单个操作的复杂冗余。提供这个接口的目的就是让他适合更多选择的人员。

```
/**
 *  description :  是否启用多行选择模式
 *  type        :  Boolean
 *  default     :  false (不启用多行选择)
 */
CurrentSession.setDefault('DataView.multiSelection',false);
```

##### enableActionColumn

如果希望在每一行提供一个操作列，可以启用这个属性，或者说让表格的原生事件来代替也可以。

```
/**
 *  description :  是否启用操作列
 *  type        :  Boolean
 *  default     :  false (不启用)
 */
CurrentSession.setDefault('DataView.enableActionColumn',false);
```

##### action

我们可以先讲操作信息都存储好，方便今后直接获取。不过很无辜的是，这里的Session不能存储函数，所以似乎要修改一下存储模式。

```
/**
 *  description :  操作列表
 *  type        :  [String]
 *  default     :  [] (无操作绑定)
 */
CurrentSession.setDefault('DataView.action',[]);
```

##### enableActionGroup

如果希望操作不是一个个独立的按钮而摆放占位置，可以启用操作组，节约空间：

```
/**
 *  description :  是否启用操作组
 *  type        :  Boolean
 *  default     :  false (不启用)
 */
CurrentSession.setDefault('DataView.enableActionGroup',false);
```

#### Selection

##### selector

一个存储查询条件的容器，这个容器对于需要增加的筛选来说非常有必要。

```
/**
 *  description :  查询对象
 *  type        :  JSON
 *  default     :  {} (数据全查询)
 *  example     :  selector = {age : {$gt : 18}} (搜索年龄大于18岁的)
 */
CurrentSession.setDefault('Selection.selector',{});
```

#### FieldSet

##### fields

如果不是查询所有字段，就一定要设置他，因为他能为你节省很多的流量。

```
/**
 *  description :  查询字段
 *  type        :  JSON
 *  default     :  {} (字段全查询)
 *  example     :  fields = {name : 1, createDate : 0} (显示name属性，但不显示createDate属性)
 */
CurrentSession.setDefault('FieldSet.fields',{});
```
##### names_shows

他能让你所查询的字段以你需要的形式展现到表头，前提是你要配置好。

```
/**
 *  description :  显示列
 *  type        :  [JSON]
 *  default     :  GridManager[name].fields (从配置文件中读取)
 *  example     :  fields = [{name : 'name', show : '姓名'}] (将name属性显示为“姓名”字符串)
 */
CurrentSession.setDefault('FieldSet.names_shows',GridManager[name].fields);
```

#### Configuration

##### title

默认情况下我们不显示任何标题，除非你需要让用户看的更直观，就需要为此设置一个。

```
/**
 *  description :  标题
 *  type        :  String
 *  default     :  '' (空字符串)
 */
CurrentSession.setDefault('Configuration.title','');
```

##### globalAction/enableActionGroup

同DataView中看到的一样，只不过他们是提供全局操作的。

#### GlobalData

##### checkedItems

如果启用了多行选择模式，被选中的行数据都会被存放到这里。

```
/**
 *  description :  已选项列表
 *  type        :  [String]
 *  default     :  [] (无)
 */
CurrentSession.setDefault('GlobalData.checkedItems',[]);
```















=======
DE-Grid
=======
>>>>>>> FETCH_HEAD
