export const tw = ([str]: TemplateStringsArray): any => {
  if (process.env.EXPO_OS === "web") {
    return { $$css: true, tw: str };
  }
  return null;
};
