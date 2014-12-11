Ember.computed.validatable = function() {
  var key = arguments[0];
  if (typeof key !== 'string') key = undefined;

  var args = new Array(key ? arguments.length : arguments.length + 1);
  args[0] = Em.Validations.Mixin;
  for (var i = 1; i < args.length; i++)
    args[i] = arguments[key ? i : i - 1];

  var proxy = Em.ObjectProxy.extend.apply(Em.ObjectProxy, args).create();

  if (!key)
    return function(dummy, value) {
      return arguments.length > 1 ? proxy.set('content', value) : proxy;
    }.property();
  else
    return function(dummy, value) {
      if (arguments.length > 1) {
        Em.set(this, key, value);
        return proxy.set('content', value);
      }
      var val = Em.get(this, key);
      proxy.set('content', val);
      return val ? proxy : val;
    }.property(key);
};
