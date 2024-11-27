import RandomDocPlugin from "./index"
import { icons } from "./utils/svg"
import { Dialog, Menu, openTab } from "siyuan"
import RandomDocContent from "./libs/RandomDocContent.svelte"
import RandomDocSetting from "./libs/RandomDocSetting.svelte"

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
    beforeDestroy() {
      delete pluginInstance.tabInstance
      pluginInstance.logger.info("tabInstance destroyed")
    },
  })

  const topBarElement = pluginInstance.addTopBar({
    icon: icons.iconTopbar,
    title: pluginInstance.i18n.randomDoc,
    position: "right",
    callback: () => {},
  })

  topBarElement.addEventListener("click", async () => {
    await triggerRandomDoc(pluginInstance)
  })

  // 添加右键菜单
  topBarElement.addEventListener("contextmenu", () => {
    let rect = topBarElement.getBoundingClientRect()
    // 如果获取不到宽度，则使用更多按钮的宽度
    if (rect.width === 0) {
      rect = document.querySelector("#barMore").getBoundingClientRect()
    }
    initContextMenu(pluginInstance, rect)
  })
}

const initContextMenu = async (pluginInstance: RandomDocPlugin, rect: DOMRect) => {
  const menu = new Menu("slugContextMenu")

  menu.addItem({
    iconHTML: icons.iconSetting,
    label: pluginInstance.i18n.setting,
    click: () => {
      showSettingMenu(pluginInstance)
    },
  })

  if (pluginInstance.isMobile) {
    menu.fullscreen()
  } else {
    menu.open({
      x: rect.right,
      y: rect.bottom,
      isLeft: true,
    })
  }
}

export const showSettingMenu = (pluginInstance: RandomDocPlugin) => {
  const settingId = "siyuan-random-doc-setting"
  const d = new Dialog({
    title: `${pluginInstance.i18n.setting} - ${pluginInstance.i18n.randomDoc}`,
    content: `<div id="${settingId}"></div>`,
    width: pluginInstance.isMobile ? "92vw" : "720px",
  })
  new RandomDocSetting({
    target: document.getElementById(settingId) as HTMLElement,
    props: {
      pluginInstance: pluginInstance,
      dialog: d,
    },
  })
}

/**
 * 触发打开tab以及开始漫游
 *
 * @param pluginInstance
 */
const triggerRandomDoc = async (pluginInstance: RandomDocPlugin) => {
  // 自定义tab
  if (!pluginInstance.tabInstance) {
    const tabInstance = openTab({
      app: pluginInstance.app,
      custom: {
        title: pluginInstance.i18n.randomDoc,
        icon: "iconRefresh",
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
    pluginInstance.tabContentInstance = new RandomDocContent({
      target: pluginInstance.tabInstance.panelElement as HTMLElement,
      props: {
        pluginInstance: pluginInstance,
      },
    })
  } else {
    await pluginInstance.tabContentInstance.doRandomDoc()
    console.log("再次点击或者重复触发")
  }
}

/**
 * 注册快捷键
 *
 * @param pluginInstance
 */
export async function registerCommand(pluginInstance: RandomDocPlugin) {
  //添加快捷键
  pluginInstance.addCommand({
    langKey: "startRandomDoc",
    hotkey: "⌥⌘M",
    callback: async () => {
      pluginInstance.logger.info("快捷键已触发 ⌘⇧M")
      await triggerRandomDoc(pluginInstance)
    },
  })
  pluginInstance.logger.info("文档漫步快捷键已注册为 ⌘⇧M")
}
