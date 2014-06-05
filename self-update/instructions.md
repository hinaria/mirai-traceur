ensure that traceur does not includ eany new breaking api changes, especially to the module transformer.

1. increment version number and dependencies
2. copy new files over
3. manually change the following

  @@ /src/options.js
  - var moduleOptions = ['amd', 'commonjs', 'instantiate', 'inline', 'register'];
  + var moduleOptions = ['amd', 'commonjs', 'instantiate', 'inline', 'register', 'mirai'];



  @@ /src/codegeneration/FromOptionsTransformer.js
  + import {MiraiModuleTransformer} from './mirai/MiraiModuleTransformer';

  ...

  if (transformOptions.modules) {
    switch (transformOptions.modules) {
  +   case 'mirai':
  +     append(MiraiModuleTransformer);
  +     break;
      case 'commonjs':
        append(CommonJsModuleTransformer);
        break;

4. then, `make prepublish`
5. `npm publish`