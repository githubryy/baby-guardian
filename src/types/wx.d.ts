/**
 * 微信小程序全局 API 类型声明
 * 补充 @dcloudio/types 中缺失的 wx 全局对象
 */
declare const wx: {
  [x: string]: any;
  cloud: {
    callFunction(options: {
      name: string;
      data?: Record<string, any>;
      success?: (res: { result: any }) => void;
      fail?: (err: any) => void;
      complete?: () => void;
    }): void;
  };
};
