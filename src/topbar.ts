import RandomDocPlugin from "./index"
import { icons } from "./utils/svg"
import { openTab } from "siyuan"
import RandomDocContent from "./libs/RandomDocContent.svelte"

/**
 * 顶栏按钮
 *
 * @param pluginInstance - 插件实例
 * @author terwer
 * @version 0.0.1
 * @since 0.0.1
 */
export async function initTopbar(pluginInstance: RandomDocPlugin) {
  const TAB_TYPE = "random_doc_custom_tab"
  pluginInstance.customTabObject = pluginInstance.addTab({
    type: TAB_TYPE,
    async init() {},
    destroy() {
      delete pluginInstance.tabInstance
    },
  })

  const topBarElement = pluginInstance.addTopBar({
    icon: icons.iconTopbar,
    title: pluginInstance.i18n.randomDoc,
    position: "right",
    callback: () => {},
  })

  topBarElement.addEventListener("click", async () => {
    // 自定义tab
    if (!pluginInstance.tabInstance) {
      const tabInstance = openTab({
        app: pluginInstance.app,
        custom: {
          title: pluginInstance.i18n.randomDoc,
          icon: "",
          id: TAB_TYPE,
          fn: pluginInstance.customTabObject,
        } as any,
      })

      // 修复后续API改动
      if (tabInstance instanceof Promise) {
        pluginInstance.tabInstance = await tabInstance
      } else {
        pluginInstance.tabInstance = tabInstance
      }

      // 加载内容
      new RandomDocContent({
        target: pluginInstance.tabInstance.panelElement as HTMLElement,
        props: {
          pluginInstance: pluginInstance,
        },
      })
    }
  })

  // 添加右键菜单
  // topBarElement.addEventListener("contextmenu", () => {
  //   let rect = topBarElement.getBoundingClientRect()
  //   // 如果获取不到宽度，则使用更多按钮的宽度
  //   if (rect.width === 0) {
  //     rect = document.querySelector("#barMore")?.getBoundingClientRect() as DOMRect
  //   }
  //   initContextMenu(pluginInstance, rect)
  // })
}

// export const showSettingMenu = (pluginInstance: RandomDocPlugin) => {
//   const settingId = "siyuan-random-doc-setting"
//   const d = new Dialog({
//     title: `${pluginInstance.i18n.setting} - ${pluginInstance.i18n.randomDoc}`,
//     content: `<div id="${settingId}"></div>`,
//     width: pluginInstance.isMobile ? "92vw" : "720px",
//   })
//   new RandomDocSetting({
//     target: document.getElementById(settingId) as HTMLElement,
//     props: {
//       pluginInstance: pluginInstance,
//       dialog: d,
//     },
//   })
// }
//
// const initContextMenu = async (pluginInstance: RandomDocPlugin, rect: DOMRect) => {
//   const menu = new Menu("randomDocContextMenu")
//
//   // 设置
//   menu.addItem({
//     iconHTML: icons.iconSetting,
//     label: pluginInstance.i18n.setting,
//     click: () => {
//       showSettingMenu(pluginInstance)
//     },
//   })
//
//   if (pluginInstance.isMobile) {
//     menu.fullscreen()
//   } else {
//     menu.open({
//       x: rect.right,
//       y: rect.bottom,
//       isLeft: true,
//     })
//   }
// }
