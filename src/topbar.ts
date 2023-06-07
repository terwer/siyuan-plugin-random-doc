import RandomDocPlugin from "./index"
import { icons } from "./utils/svg"
import { confirm, Dialog, Menu, openTab, showMessage } from "siyuan"
import RandomDocSetting from "./libs/RandomDocSetting.svelte"

const renderTabHtml = async (pluginInstance: RandomDocPlugin, rndId?: string) => {
  if (!rndId) {
    return ""
  }

  const doc = (await pluginInstance.kernelApi.getDoc(rndId)).data as any
  pluginInstance.logger.debug(`getDoc ${rndId} => `, doc)
  const content = doc.content
  pluginInstance.logger.debug("Md2BlockDOM content =>", {
    content: content,
  })

  const total = await pluginInstance.kernelApi.getRootBlocksCount()
  let visitCount = (await pluginInstance.kernelApi.getBlockAttrs(rndId))["custom-visit-count"] ?? 0
  const tips = `哇哦，穿越大山，跨国大河，在${total}篇文档中，我又为您找到了一篇新的，您已经访问过他${visitCount}次哦~`
  const contentHtml = `
  <div class="fn__flex-1 protyle" data-loading="finished">
      <div class="protyle-content protyle-content--transition" data-fullwidth="true">
          <div class="protyle-wysiwyg protyle-wysiwyg--attr" spellcheck="false" contenteditable="false" style="padding: 16px 96px 281.5px;" data-doc-type="NodeDocument">
            <div style="margin:20px 0"><button class="b3-button" id="edit">新页签编辑</button></div>
            <div class="rnd-doc-custom-tips">
              <div data-type="NodeParagraph" class="p" style="color: var(--b3-card-info-color);background-color: var(--b3-card-info-background);">
                  <div class="t" contenteditable="false" spellcheck="false">${tips}</div><div class="protyle-attr" contenteditable="false"></div>
              </div>
            </div>
            ${content.replaceAll('contenteditable="true"', 'contenteditable="false"')}
          </div>
      </div>
  </div>`

  await pluginInstance.kernelApi.setBlockAttrs(rndId, {
    "custom-visit-count": (++visitCount).toString(),
  })
  return contentHtml
}

const openDocEditor = async (pluginInstance: RandomDocPlugin, rndId: string) => {
  await openTab({
    app: pluginInstance.app,
    doc: {
      id: rndId,
    },
  })
}

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
    async init() {
      this.element.innerHTML = await renderTabHtml(pluginInstance)
    },
    destroy() {
      delete pluginInstance.tabInstance
      confirm("⚠️温馨提示", "是否重载？", () => {
        window.location.reload()
      })
    },
  })

  const topBarElement = pluginInstance.addTopBar({
    icon: icons.iconTopbar,
    title: pluginInstance.i18n.randomDoc,
    position: "right",
    callback: () => {},
  })

  topBarElement.addEventListener("click", async () => {
    const rndResult = await pluginInstance.kernelApi.getRandomRootBlocks()
    if (rndResult.code !== 0) {
      showMessage(pluginInstance.i18n.docFetchError, 7000, "error")
      return
    }
    const rndId = rndResult.data[0].root_id

    // 自定义tab
    if (!pluginInstance.tabInstance) {
      pluginInstance.tabInstance = openTab({
        app: pluginInstance.app,
        custom: {
          icon: "",
          title: pluginInstance.i18n.randomDoc,
          fn: pluginInstance.customTabObject,
        },
      })
    }
    pluginInstance.tabInstance.panelElement.innerHTML = await renderTabHtml(pluginInstance, rndId)
    pluginInstance.tabInstance.panelElement.querySelector("#edit").addEventListener("click", () => {
      openDocEditor(pluginInstance, rndId)
    })
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

const initContextMenu = async (pluginInstance: RandomDocPlugin, rect: DOMRect) => {
  const menu = new Menu("randomDocContextMenu")

  // 设置
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
