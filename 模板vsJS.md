模板 vs JS
---------

## 提要

Meteor中，我们可以在`.html`中直接创建模板和使用模板。构建的模板会被编译成JS代码，也就是说，我们可以直接构建JS代码去渲染模板。这种方法非常的简单，其形式同`ExtJS`几乎如出一辙。接下来我们一一讲解：

##  Template vs JavaScript

### 文本内容

这是我们常见的最简单的模板，模板中只有普通的文本内容：

```html
<template name="temp">
 文本内容
</template>
```

他与一下的两段JS代码都是的等价的：

```javascript
UI.Component.extend({
  render:function(){
    return '文本内容';
  }
});
```

```javascript
UI.Component.extend({
  render:function(){
    return HTML.Raw('文本内容');
  }
});
```

`HTML.Raw(value)`是将一个字符串以HTML的文本内容的方式进行输出。如果输出的内容有多行，例如：

```html
<template name="temp">
 文本内容1
 文本内容2
 文本内容3
</template>
```

虽然在渲染的时候会被渲染成为同一行，但是在编译的时候，依然是有区分的，他会被渲染成：

```javascript
UI.Component.extend({
  render:function(){
    return ['文本内容1','\n','文本内容2','\n','文本内容3'];
  }
});
```

与其等价的，如果使用`HTML.Raw`,就应该在外围构建数组：

```javascript
UI.Component.extend({
  render:function(){
    return [HTML.Raw('文本内容1'),HTML.Raw('\n'),HTML.Raw('文本内容2'),HTML.Raw('\n'),HTML.Raw('文本内容3')];
  }
});
```

如上，返回的只要是数组，就会当成多行或者并行的多个元素来处理。

### DOM元素

如果希望在模板内渲染DOM元素，使用之前的方法是显然不行的，他都会对你的字符串内容进行转义。当然，你可以让他不转义：

```javascript
UI.Component.extend({
  render:function(){
    return Spacebars.makeRaw('<h1>标题</h1>');
  }
});
```

这样，字符串的内容都不会被转义，而按照HTML的方式渲染DOM元素。但除了这样地方方式，Meteor中还提供了大量的`HTML.*`的方式来构建HTML元素，例如我们要构建`<div class="title"><h1 style="font-size:24px">标题</h1></div>`，我们可以按照如下方式快速构建：

```javascript
UI.Component.extend({
  render:function(){
    return 
    HTML.DIV({class : 'title'},
      HTML.H1({style : 'font-size:24px'},
        '标题'        //只要是字符串，都可以替换成HTML.Raw
      )
    );
  }
});
```

我对他的书写结构进行了整理，这样，让我们看上去更像是HTML的树型结构。如果是并行的DOM元素，同之前一样，使用数组即可，例如我们构建一个UL：

```javascript
UI.Component.extend({
  render:function(){
    return 
    HTML.UL({class : 'list'},[
      HTML.LI({class : 'enabled'},'第一项'),
      HTML.LI({},'第二项'),
      HTML.LI({},'第三项'),
      HTML.LI({},'第四项'),
      HTML.LI({},'第五项'),
    ]);
  }
});
```

### 嵌套模板

如果我们要在模板中嵌套模板，很常见的就是如下例子：

```html
<template name="temp">
  {{> otherTemplate}}
</template>
```

与其的等价的就是：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return Spacebars.include(self.lookupTemplate('otherTemplate'));
  }
});
```

`Spacebars.include`表示就是插入的意思，`self.lookupTemplate(tempName)`就是表示你要插入的模板是哪一个。

### 嵌套Helper

如果我们要在模板中嵌套Helper（可以看作是变量），比较常见的例子是：

```html
<template name="temp">
  {{ title }}
</template>
```

与其等价的就是：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return Spacebars.mustache(self.lookup('title'));
  }
});
```

Meteor很搞笑的使用`Spacebars.mustache`（胡子的意思）来表示引入一个Helper或者当前可引入属性。而插入的属性不再像之前是模板了，而是`self.lookup(proName)`。

### 嵌套块

对于模板和Helper都是属于单行结构，而全局Helper可以使用复行结构，也就是块，例如：

```html
<template name="temp">
  {{#Grid}}
    {{title}}
  {{/Grid}}
</template>
```

全局的Helper同模板是一样的，但是他的内部是允许再构建的。所以，我们要按照如下方式编写JS：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return Spacebars.include(self.lookupTemplate('Grid'),UI.block(function(){
      var self = this;
      return Spacebars.mustache(self.lookup('title'));
    }));
  }
});
```

对于跟之前的Helper的区别，就是再后面加入了`UI.block(fn)`，函数体中指定监听哪个Helper或可引入属性。

### 参数

无论是模板或者Helper还是全局Helper，都是可以加入参数或者变量的，例如：

```html
<template name="temp">
  {{#Grid uuid}}
    {{> renderUUID uuid}}
  {{/Grid}}
</template>
```

这个比较复杂，但慢慢看还是能够看懂，他等价于：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return Spacebars.TemplateWith(function(){
      return Spacebars.call(self.lookup('uuid'));
    },UI.block(function(){
      var self = this;
      return Spacebars.include(self.lookupTemplate('Grid'),UI.block(function(){
        var self = this;
        return Spacebars.TemplateWith(function(){
          return Spacebars.call(self.lookup('uuid'));
        },UI.block(function(){
          var self = this;
          return Spacebars.include(self.lookupTemplate('renderUUID'));
        }));
      }));
    }));
});
```

这个转换的代码是非常大的，但是经验丰富的我们不难看出，其实参数是被提升到了模板或者Helper的上一层。大致就是：

```html
<template name="temp">
  {{#TemplateWith uuid}}
    {{#Grid}}
      {{#TemplateWith uuid}}
        {{> renderUUID}}
      {{/TemplateWith}}
    {{/Grid}}
  {{/TemplateWith}}
</template>
```

这样我们就非常容易理解他的封装方法了。如果是多个参数，例如：

```html
<template name="temp">
  {{> render uuid _id}}
</template>
```

方式是差不多的，但是监听的不再是一个参数，而是多个，他就会转换成：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return Spacebars.TemplateWith(function(){
      return Spacebars.dataMustache(self.lookup('uuid'), self.lookup('_id'));
    },UI.block(function(){
      var self = this;
      return Spacebars.include(self.lookupTemplate('render'));
    }));
});
```

包裹的参数可以是：字符串、布尔、数字、Null或者可供监听的变量、Helper，否则会直接报错的。如果包裹的参数是直接量，那么`Spacebars.TemplateWith`返回的就是直接量。

### 包裹组件

如果你希望组件里面还能包裹组件，那么`return`的时候返回组件即可。`return`可以是`null`或者`template`，而模板`template`就是指的组件`Component`。因此，你可以这样去构建你自己的组件：

```javascript
var comp1 = UI.Component.extend({
  render:function(){
    return '组件1';  
  }
});
var comp2 = UI.Component.extend({
  render:function(){
    return '组件2';  
  }
});
var comp = UI.Component.extend({
  render:function(){
    return [comp1,comp2]; 
  }
});
```

### 包裹自定义内容

如果希望包裹的内容完全由自己手工定义，就将其内部全部抛出来即可：

```javascript
Template.temp = UI.Component.extend({
  render:function(){
    return this.__content;
  }
});
```

那么这个模板在使用时，你在内部写什么，就会渲染什么，是属于完全自定义的。

## 系统内建模板

下面我们来看看系统内建的几个全局Helper是如何通过代码构建的吧。

### if

```html
<template name="temp">
  {{#if prop}}
    属性存在
  {{/if}}
</template>
```

他所转换的内容同包裹参数是一样的，只不过不再是`Spacebars.TemplateWith`，而是`UI.IF`。这个API是系统内建的，用前面的知识，我们可以轻松构建：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return UI.IF(function(){
      return Spacebars.call(self.lookup('prop'));
    },UI.block(function(){
      return '属性存在';
    }));
  }
});
```

如果`if`中含有`else`就不一样了。因为`else`并不是全局的，而是只在`if`中才存在的。`UI.IF`还有第三个参数，专门处理`else`的块：

```html
<template name="temp">
  {{#if prop}}
    属性存在
  {{else}}
    属性不存在
  {{/if}}
</template>
```

转换过来就应该是：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return UI.IF(function(){
      return Spacebars.call(self.lookup('prop'));
    },UI.block(function(){
      return '属性存在';
    }),UI.block(function(){
      return '属性不存在';
    }));
  }
});
```

### with

```html
<template name="temp">
  {{#with obj x=1 y=2}}
    {{obj}}
  {{/with}}
</template>
```

转换过来就是：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return UI.With(function(){
      return Spacebars.dataMustache(self.lookup('obj'),Spacebars.kw({x : 1, y : 2}));
    },UI.block(function(){
      var self = this;
      return Spacebars.mustache(self.lookup('obj'));
    }));
  }
});
```

熟悉的`with`用法的都知道，他可以改变块的作用对象。

### each

例如，我们去遍历错误信息：

```html
<template name="temp">
  {{#each errors}}
    {{message}}
  {{/each}}
</template>
```

转换成JS代码就是：

```javascript
UI.Component.extend({
  render:function(){
    var self = this;
    return UI.Each(function(){
      return Spacebars.call(self.lookup('errors'));
    },UI.block(function(){
      var self = this;
      return Spacebars.mustache(self.lookup('message'));
    }));
  }
});
```

##  总结

总的来说，将模板代码转换为JS代码还是相对比较容易的。这种方式同Extjs是相当相似的。但仍需要注意几个地方：

0.  `render`是必须的，而且只能返回null或者组件（模板）
0.  `init`、`guid`、`kind`等都是父类`UI.Compoment`的特有属性，只能覆盖。`init`是一个初始化函数，可以初始化一些组件内数据。
0.  `helpers`、`events`是特定的两个方法，同`Template`方法一致，是不可重载的。
0.  继承的其他属性都可以被当作组件内的Helper使用。
0.  如果你不知道JS是怎么写的，可以先写模板代码，然后运行一个，在控制台查看他的堆栈信息，在render中查看即可。












































